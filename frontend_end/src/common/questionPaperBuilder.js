import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../App.css";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useLocation } from "react-router-dom";

function QuestionPaperBuilder() {
  const API_BASE = process.env.REACT_APP_API_BASE_URL;
  const location = useLocation();
  const [subject, setSubject] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [semester, setSemester] = useState("");
  const [instructions, setInstructions] = useState("");
  const [cos, setCOs] = useState([""]);
  const [modules, setModules] = useState([]);
  const [nextGroupNumber, setNextGroupNumber] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const inactivityTimer = useRef(null);
  const previewRef = useRef(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [facultyEmail, setFacultyEmail] = useState("");
  const [examType, setExamType] = useState("SEE");
  const [cieQuestions, setCieQuestions] = useState([]);
  const [nextCieQuestionId, setNextCieQuestionId] = useState(1);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const markPresets = {
    "a, b, c, d (5 marks each)": [5, 5, 5, 5],
    "a, b (10 marks each)": [10, 10],
    "a, b, c (7,7,6 marks)": [7, 7, 6],
    "a, b, c (8,8,4 marks)": [8, 8, 4],
  };

  const ciePatterns = {
    "1 question (10 marks)": { parts: ["main"], marks: [10] },
    "2 sub-questions (6,4 marks)": { parts: ["a", "b"], marks: [6, 4] },
    "2 sub-questions (5,5 marks)": { parts: ["a", "b"], marks: [5, 5] },
    "2 sub-questions (7,3 marks)": { parts: ["a", "b"], marks: [7, 3] },
    "3 sub-questions (4,3,3 marks)": { parts: ["a", "b", "c"], marks: [4, 3, 3] },
    "3 sub-questions (5,3,2 marks)": { parts: ["a", "b", "c"], marks: [5, 3, 2] }
  };

  /** ------------------------
   * 🔍 Load Faculty Data and Assigned Subjects
   ------------------------- */
  useEffect(() => {
    // Get faculty email from localStorage
    const storedFacultyData = localStorage.getItem("faculty_data");
    if (storedFacultyData) {
      const data = JSON.parse(storedFacultyData);
      setFacultyEmail(data.email);
      
      // Fetch assigned subjects for this faculty
      if (data.email) {
        fetch(`${API_BASE}/faculty/subject-codes/${data.email}`)
          .then(res => res.json())
          .then(subjects => {
            setAssignedSubjects(subjects);
            
            // If state was passed from faculty dashboard, pre-select the subject
            if (location.state?.subjectCode) {
              const selectedSubject = subjects.find(sub => sub.subject_code === location.state.subjectCode);
              if (selectedSubject) {
                setSubjectCode(selectedSubject.subject_code);
                setSubject(selectedSubject.subject_name || "");
              }
            }
          })
          .catch(err => {
            console.error('Error fetching assigned subjects:', err);
            setAssignedSubjects([]);
          });
      }
    }
  }, [API_BASE, location.state]);

  /** ------------------------
   * 💾 Load Draft Data from localStorage
   ------------------------- */
  useEffect(() => {
    const loadDraftData = () => {
      try {
        const draftKey = `questionPaper_draft_${facultyEmail}`;
        const savedDraft = localStorage.getItem(draftKey);
        
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft);
          
          // Only load draft if not submitted
          if (!draftData.isSubmitted) {
            setSubject(draftData.subject || "");
            setSubjectCode(draftData.subjectCode || "");
            setSemester(draftData.semester || "");
            setInstructions(draftData.instructions || "");
            setCOs(draftData.cos || [""]);
            setModules(draftData.modules || []);
            setNextGroupNumber(draftData.nextGroupNumber || 1);
            setExamType(draftData.examType || "SEE");
            setCieQuestions(draftData.cieQuestions || []);
            setNextCieQuestionId(draftData.nextCieQuestionId || 1);
            setIsSubmitted(draftData.isSubmitted || false);
            setDraftLoaded(true);
            
            console.log("📄 Draft data loaded successfully");
          }
        }
      } catch (error) {
        console.error("Error loading draft data:", error);
      }
    };

    // Load draft after faculty email is set
    if (facultyEmail) {
      loadDraftData();
    }
  }, [facultyEmail]);

  /** ------------------------
   * 🛑 Inactivity Logout (5 mins)
   ------------------------- */
  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (!isSubmitted) saveQuestionPaper(true);
      setTimeout(() => {
        alert("⏳ Session expired due to inactivity. You are being logged out.");
        window.location.href = "/login";
      }, 500);
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click"];
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach((e) =>
        window.removeEventListener(e, resetInactivityTimer)
      );
      clearTimeout(inactivityTimer.current);
    };
  }, []);

  /** ------------------------
   * 💾 Auto-save every 2 mins (Background save, no alert)
   ------------------------- */
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (!isSubmitted) {
        saveDraftToLocalStorage();
        console.log("💾 Auto-saved draft (background)");
      }
    }, 2 * 60 * 1000);
    return () => clearInterval(autoSaveInterval);
  }, [subject, subjectCode, semester, instructions, cos, modules, examType, cieQuestions, isSubmitted]);

  /** ------------------------
   * 📌 Add / Update Functions
   ------------------------- */
  const addCO = () => !isSubmitted && setCOs([...cos, ""]);
  const updateCO = (i, val) => {
    if (isSubmitted) return;
    const updated = [...cos];
    updated[i] = val;
    setCOs(updated);
  };

  // Handle subject code selection and auto-populate subject name
  const handleSubjectCodeChange = (selectedCode) => {
    if (isSubmitted) return;
    setSubjectCode(selectedCode);
    
    // Find the corresponding subject name
    const selectedSubject = assignedSubjects.find(sub => sub.subject_code === selectedCode);
    if (selectedSubject) {
      setSubject(selectedSubject.subject_name || "");
    } else {
      setSubject("");
    }
  };

  const generateQuestions = (prefix, marksList) => {
    return marksList.map((mark, i) => ({
      label: `${prefix}${String.fromCharCode(97 + i)}`,
      text: "",
      marks: mark,
      co: "",
      level: "",
      image: null, // 👈 store selected file
    }));
  };

  const addEmptyModule = () => {
    if (isSubmitted) return;
    setModules([
      ...modules,
      {
        title: `Module ${modules.length + 1}`,
        pattern: "",
        groups: [],
      },
    ]);
  };

  const setModulePatternAndGenerate = (modIndex, pattern) => {
    if (isSubmitted) return;
    const marksList = markPresets[pattern];
    const group1 = generateQuestions(nextGroupNumber, marksList);
    const group2 = generateQuestions(nextGroupNumber + 1, marksList);

    const updatedModules = [...modules];
    updatedModules[modIndex].pattern = pattern;
    updatedModules[modIndex].groups = [group1, group2];
    setModules(updatedModules);
    setNextGroupNumber(nextGroupNumber + 2);
  };

  const updateQuestion = (modIndex, groupIndex, qIndex, key, val) => {
    if (isSubmitted) return;
    const updatedModules = [...modules];
    updatedModules[modIndex].groups[groupIndex][qIndex][key] = val;
    setModules(updatedModules);
  };

  const addCieQuestion = () => {
    if (isSubmitted) return;
    const newQuestion = {
      id: nextCieQuestionId,
      pattern: "",
      subQuestions: [],
      co: "CO1",
      level: "L1"
    };
    setCieQuestions([...cieQuestions, newQuestion]);
    setNextCieQuestionId(nextCieQuestionId + 1);
  };

  const updateCieQuestionPattern = (questionId, pattern) => {
    if (isSubmitted) return;
    const patternData = ciePatterns[pattern];
    if (!patternData) return;

    const updatedQuestions = cieQuestions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            pattern, 
            subQuestions: patternData.parts.map((part, index) => ({
              label: part,
              text: "",
              marks: patternData.marks[index],
              co: q.co,
              level: q.level,
              image: null
            }))
          } 
        : q
    );
    setCieQuestions(updatedQuestions);
  };

  const updateCieSubQuestion = (questionId, subIndex, key, val) => {
    if (isSubmitted) return;
    const updatedQuestions = cieQuestions.map(q => 
      q.id === questionId 
        ? {
            ...q,
            subQuestions: q.subQuestions.map((sub, index) => 
              index === subIndex ? { ...sub, [key]: val } : sub
            )
          }
        : q
    );
    setCieQuestions(updatedQuestions);
  };

  const deleteCieQuestion = (questionId) => {
    if (isSubmitted) return;
    setCieQuestions(cieQuestions.filter(q => q.id !== questionId));
  };

  const deleteModule = (modIndex) => {
    if (isSubmitted) return;
    if (window.confirm(`Are you sure you want to delete ${modules[modIndex].title}?`)) {
      setModules(modules.filter((_, index) => index !== modIndex));
    }
  };

  /** ------------------------
   * ✅ Validation Function
   ------------------------- */
  const validatePaper = () => {
    if (!subject || !subjectCode || !semester) {
      alert("⚠️ Please fill subject code, name and semester.");
      return false;
    }

    // Validate CIE questions
    if (examType === "CIE") {
      for (let question of cieQuestions) {
        if (!question.pattern) {
          alert(`⚠️ CIE Question ${question.id} - Please select a pattern.`);
          return false;
        }

        for (let sub of question.subQuestions) {
          if (!sub.text.trim()) {
            alert(`⚠️ CIE Question ${question.id} - Please fill all sub-questions.`);
            return false;
          }
        }
      }
    }

    // Validate SEE modules (existing logic)
    for (let mod of modules) {
      for (let group of mod.groups) {
        // Validation: all sub-questions in a group must be filled
        const anyFilled = group.some((q) => q.text.trim() !== "");
        const anyEmpty = group.some((q) => q.text.trim() === "");
        if (anyFilled && anyEmpty) {
          alert(
            `⚠️ Incomplete group in ${mod.title}, question set ${group[0].label[0]}`
          );
          return false;
        }

        // Validation: marks should not exceed 20
        const totalMarks = group.reduce(
          (sum, q) => sum + (q.marks || 0),
          0
        );
        if (totalMarks > 20) {
          alert(
            `⚠️ Marks exceed 20 in ${mod.title}, question set ${group[0].label[0]}`
          );
          return false;
        }
      }
    }
    return true;
  };

  /** ------------------------
   * 💾 Save Draft to localStorage
   ------------------------- */
  const saveDraftToLocalStorage = () => {
    try {
      const draftKey = `questionPaper_draft_${facultyEmail}`;
      
      // Convert File objects to base64 for storage
      const modulesForStorage = modules.map(mod => ({
        ...mod,
        groups: mod.groups.map(group => 
          group.map(q => ({
            ...q,
            image: q.image instanceof File ? URL.createObjectURL(q.image) : q.image
          }))
        )
      }));
      
      const cieQuestionsForStorage = cieQuestions.map(q => ({
        ...q,
        subQuestions: q.subQuestions.map(sub => ({
          ...sub,
          image: sub.image instanceof File ? URL.createObjectURL(sub.image) : sub.image
        }))
      }));
      
      const draftData = {
        subject,
        subjectCode,
        semester,
        instructions,
        cos,
        modules: modulesForStorage,
        nextGroupNumber,
        examType,
        cieQuestions: cieQuestionsForStorage,
        nextCieQuestionId,
        isSubmitted,
        lastSavedAt: new Date().toISOString()
      };
      
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastSavedAt(new Date().toISOString());
      console.log("💾 Draft saved to localStorage");
    } catch (error) {
      console.error("Error saving draft to localStorage:", error);
    }
  };

  /** ------------------------
   * 💾 Save or Submit
   ------------------------- */
  const saveQuestionPaper = async (isDraft = false) => {
    try {
      const now = new Date().toISOString();

      // Always save draft to localStorage first
      saveDraftToLocalStorage();

      // If it's just a draft, don't send to server
      if (isDraft) {
        console.log("Draft saved locally at", now);
        return;
      }

      // Save CIE questions to server
      if (examType === "CIE") {
        for (let question of cieQuestions) {
          for (let sub of question.subQuestions) {
            if (sub.text.trim() !== "") {
              const formData = new FormData();
              formData.append("subject_code", subjectCode);
              formData.append("subject_name", subject);
              formData.append("semester", semester);
              formData.append("question_number", `Q${question.id}(${sub.label})`);
              formData.append("question_text", sub.text);
              formData.append("co", sub.co);
              formData.append("level", sub.level);
              formData.append("marks", sub.marks);
              formData.append("faculty_email", facultyEmail);
              formData.append("exam_type", "CIE");
              if (sub.image) formData.append("file", sub.image);

              await axios.post(
                `${API_BASE}/question-bank`,
                formData,
                {
                  headers: { "Content-Type": "multipart/form-data" },
                }
              );
            }
          }
        }
      }

      // Save SEE modules to server
      for (let mod of modules) {
        for (let group of mod.groups) {
          for (let q of group) {
            if (q.text.trim() !== "") {
              const formData = new FormData();
              formData.append("subject_code", subjectCode);
              formData.append("subject_name", subject);
              formData.append("semester", semester);
              formData.append("question_number", q.label);
              formData.append("question_text", q.text);
              formData.append("co", q.co);
              formData.append("level", q.level);
              formData.append("marks", q.marks);
              formData.append("faculty_email", facultyEmail);
              formData.append("exam_type", "SEE");
              if (q.image) formData.append("file", q.image);

              await axios.post(
                `${API_BASE}/question-bank`,
                formData,
                {
                  headers: { "Content-Type": "multipart/form-data" },
                }
              );
            }
          }
        }
      }

      // Mark as submitted and clear draft
      setIsSubmitted(true);
      const draftKey = `questionPaper_draft_${facultyEmail}`;
      localStorage.removeItem(draftKey);
      
      alert("✅ All questions submitted successfully!");
    } catch (error) {
      console.error("Error saving question bank:", error);
      alert("❌ Failed to save questions.");
    }
  };

  const confirmAndSubmit = () => {
    if (!validatePaper()) return;
    if (
      window.confirm(
        "Are you sure you want to submit? After submission, editing will be locked."
      )
    ) {
      saveQuestionPaper(false);
    }
  };

  /** ------------------------
   * 🗑️ Clear Draft
   ------------------------- */
  const clearDraft = () => {
    if (window.confirm("Are you sure you want to clear the saved draft? This action cannot be undone.")) {
      const draftKey = `questionPaper_draft_${facultyEmail}`;
      localStorage.removeItem(draftKey);
      
      // Reset form to initial state
      setSubject("");
      setSubjectCode("");
      setSemester("");
      setInstructions("");
      setCOs([""]);
      setModules([]);
      setNextGroupNumber(1);
      setExamType("SEE");
      setCieQuestions([]);
      setNextCieQuestionId(1);
      setIsSubmitted(false);
      setDraftLoaded(false);
      setLastSavedAt(null);
      
      alert("✅ Draft cleared successfully!");
    }
  };

  /** ------------------------
   * ⬇️ Download Preview as PDF
   * ------------------------- */
  const downloadPreviewAsPdf = async () => {
    try {
      const element = previewRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${subjectCode || "question-paper"}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert("❌ Failed to generate PDF. Please try again.");
    }
  };

  /** ------------------------
   * 🎨 UI Rendering
   ------------------------- */
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Faculty Portal</h2>
        <p>Question Paper Builder</p>
      </div>

      <div className="main-content">
        <h1>📘 Question Paper Setter</h1>

        {draftLoaded && (
          <div className="draft-notification" style={{
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '15px',
            color: '#2e7d32'
          }}>
            <p>📄 <strong>Draft loaded!</strong> Your previous work has been restored.</p>
          </div>
        )}

        {lastSavedAt && (
          <p className="timestamp">
            Last saved at: {new Date(lastSavedAt).toLocaleString()}
          </p>
        )}

        <div className="exam-type-selection">
          <label>Exam Type:</label>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            disabled={isSubmitted}
          >
            <option value="SEE">SEE</option>
            <option value="CIE">CIE</option>
          </select>
        </div>

        <div className="student-info">
          <label>Subject Code:</label>
          {assignedSubjects.length > 0 ? (
            <select
              value={subjectCode}
              onChange={(e) => handleSubjectCodeChange(e.target.value)}
              disabled={isSubmitted}
            >
              <option value="">Select Assigned Subject Code</option>
              {assignedSubjects.map((sub, index) => (
                <option key={index} value={sub.subject_code}>
                  {sub.subject_code}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              placeholder="No assigned subjects"
              disabled={true}
            />
          )}
          <label>Subject Name:</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Auto-populated from selected subject code"
            disabled={isSubmitted}
          />
          <label>Semester:</label>
          <input
            type="text"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="e.g., 4th Semester B.E."
            disabled={isSubmitted}
          />
        </div>

        <label>Student Instructions:</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          placeholder="Write general instructions here"
          disabled={isSubmitted}
        />

        <h3>📌 Course Outcomes (COs)</h3>
        {cos.map((co, i) => (
          <input
            key={i}
            value={co}
            onChange={(e) => updateCO(i, e.target.value)}
            placeholder={`CO${i + 1}`}
            disabled={isSubmitted}
          />
        ))}
        {!isSubmitted && <button onClick={addCO}>➕ Add CO</button>}

        {examType === "SEE" && (
          <>
            <h3>📚 Modules</h3>
            {!isSubmitted && <button onClick={addEmptyModule}>➕ Add Module</button>}
          </>
        )}

        {examType === "CIE" && (
          <>
            <h3>📝 Questions</h3>
            <div className="cie-info">
              
            </div>
            {!isSubmitted && (
              <button onClick={addCieQuestion} className="add-question-btn">
                ➕ Add Question
              </button>
            )}
          </>
        )}

        {examType === "SEE" && modules.map((mod, modIndex) => (
          <div key={modIndex} className="module-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>{mod.title}</h4>
              {!isSubmitted && (
                <button 
                  onClick={() => deleteModule(modIndex)}
                  className="delete-question-btn"
                  style={{ marginLeft: '10px' }}
                >
                  🗑️ Delete Module
                </button>
              )}
            </div>
            {mod.groups.length === 0 ? (
              !isSubmitted && (
                <>
                  <label>Choose Question Pattern:</label>
                  <select
                    value={mod.pattern}
                    onChange={(e) =>
                      setModulePatternAndGenerate(modIndex, e.target.value)
                    }
                  >
                    <option value="">-- Select Marks Distribution --</option>
                    {Object.keys(markPresets).map((label, i) => (
                      <option key={i} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </>
              )
            ) : (
              mod.groups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {group.map((q, qIndex) => (
                    <div key={qIndex} className="question-row">
                      <label>{q.label})</label>
                      <input
                        value={q.text}
                        onChange={(e) =>
                          updateQuestion(
                            modIndex,
                            groupIndex,
                            qIndex,
                            "text",
                            e.target.value
                          )
                        }
                        placeholder="Question text"
                        disabled={isSubmitted}
                      />
                      <select
                        value={q.co}
                        onChange={(e) =>
                          updateQuestion(
                            modIndex,
                            groupIndex,
                            qIndex,
                            "co",
                            e.target.value
                          )
                        }
                        className="small"
                        disabled={isSubmitted}
                      >
                        
                        <option value="CO1">CO1</option>
                        <option value="CO2">CO2</option>
                        <option value="CO3">CO3</option>
                        <option value="CO4">CO4</option>
                        <option value="CO5">CO5</option>
                      </select>
                      <select
                        value={q.level}
                        onChange={(e) =>
                          updateQuestion(
                            modIndex,
                            groupIndex,
                            qIndex,
                            "level",
                            e.target.value
                          )
                        }
                        className="small"
                        disabled={isSubmitted}
                      >
                        
                        <option value="L1">L1</option>
                        <option value="L2">L2</option>
                        <option value="L3">L3</option>
                        <option value="L4">L4</option>
                        <option value="L5">L5</option>
                      </select>
                      <input
                        type="number"
                        value={q.marks}
                        onChange={(e) =>
                          updateQuestion(
                            modIndex,
                            groupIndex,
                            qIndex,
                            "marks",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="small"
                        disabled={isSubmitted}
                      />

                      {/* 👇 Image Upload */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          updateQuestion(
                            modIndex,
                            groupIndex,
                            qIndex,
                            "image",
                            e.target.files[0] || null
                          )
                        }
                        disabled={isSubmitted}
                      />
                      {q.image && q.image instanceof File && (
                        <img
                          src={URL.createObjectURL(q.image)}
                          alt="question"
                          style={{
                            maxWidth: "150px",
                            display: "block",
                            marginTop: "5px",
                          }}
                        />
                      )}
                    </div>
                  ))}
                  {groupIndex === 0 && (
                    <p className="or-text">
                      <strong>-- OR --</strong>
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        ))}

        {/* CIE Questions Section */}
        {examType === "CIE" && (
          <div className="cie-questions-section">
            {cieQuestions.map((question) => (
              <div key={question.id} className="cie-question-box">
                <div className="question-header">
                  <h4>Question {question.id}</h4>
                  {!isSubmitted && (
                    <button 
                      onClick={() => deleteCieQuestion(question.id)}
                      className="delete-question-btn"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>

                <div className="pattern-selection">
                  <label>Choose Marks Distribution Pattern:</label>
                  <select
                    value={question.pattern}
                    onChange={(e) => updateCieQuestionPattern(question.id, e.target.value)}
                    disabled={isSubmitted}
                  >
                    <option value="">-- Select Pattern --</option>
                    {Object.keys(ciePatterns).map((pattern, i) => (
                      <option key={i} value={pattern}>
                        {pattern}
                      </option>
                    ))}
                  </select>
                </div>

                {question.subQuestions.length > 0 && (
                  <div className="sub-questions">
                    {question.subQuestions.map((sub, subIndex) => (
                      <div key={subIndex} className="sub-question">
                        <div className="sub-question-header">
                          <label>{sub.label === "main" ? `${question.id})` : `${question.id}${sub.label})`}</label>
                          <span className="marks-display">[{sub.marks} marks]</span>
                        </div>
                        
                        <textarea
                          value={sub.text}
                          onChange={(e) => updateCieSubQuestion(question.id, subIndex, "text", e.target.value)}
                          placeholder="Question text"
                          rows={3}
                          disabled={isSubmitted}
                        />
                        
                        <div className="sub-question-meta">
                          <select
                            value={sub.co}
                            onChange={(e) => updateCieSubQuestion(question.id, subIndex, "co", e.target.value)}
                            disabled={isSubmitted}
                            className="small"
                          >
                            <option value="CO1">CO1</option>
                            <option value="CO2">CO2</option>
                            <option value="CO3">CO3</option>
                            <option value="CO4">CO4</option>
                            <option value="CO5">CO5</option>
                          </select>
                          
                          <select
                            value={sub.level}
                            onChange={(e) => updateCieSubQuestion(question.id, subIndex, "level", e.target.value)}
                            disabled={isSubmitted}
                            className="small"
                          >
                            <option value="L1">L1</option>
                            <option value="L2">L2</option>
                            <option value="L3">L3</option>
                            <option value="L4">L4</option>
                            <option value="L5">L5</option>
                          </select>
                          
                          <input
                            type="number"
                            value={sub.marks}
                            onChange={(e) => updateCieSubQuestion(question.id, subIndex, "marks", parseInt(e.target.value) || 0)}
                            className="small"
                            disabled={isSubmitted}
                          />
                          
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => updateCieSubQuestion(question.id, subIndex, "image", e.target.files[0] || null)}
                            disabled={isSubmitted}
                          />
                          
                          {sub.image && sub.image instanceof File && (
                            <img
                              src={URL.createObjectURL(sub.image)}
                              alt="question"
                              style={{
                                maxWidth: "150px",
                                display: "block",
                                marginTop: "5px",
                              }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <hr />
        <h2>🖨 Question Paper Preview</h2>
        <div className="preview" ref={previewRef}>
          <p>
            <strong>Subject:</strong> {subject} ({subjectCode})
          </p>
          <p>
            <strong>Semester:</strong> {semester || "[Semester]"}
          </p>
          
          <p>{instructions}</p>

          <h4>Course Outcomes:</h4>
          <ul>
            {cos.map((co, i) => (
              <li key={i}>{co}</li>
            ))}
          </ul>

          {/* CIE Questions Preview */}
          {examType === "CIE" && cieQuestions.map((question, questionIndex) => (
            <div key={question.id}>
              <h4>Question {question.id}</h4>
              {question.subQuestions.length === 0 ? (
                <em>Pattern not selected yet</em>
              ) : (
                question.subQuestions.map((sub, subIndex) => (
                  <div key={subIndex}>
                    {sub.label === "main" ? `${question.id})` : `${question.id}${sub.label})`} {sub.text} <strong>[{sub.marks} marks]</strong>
                    <em> CO: {sub.co || "N/A"}</em>
                    <em> | L: {sub.level || "N/A"}</em>
                    {sub.image && sub.image instanceof File && (
                      <img
                        src={URL.createObjectURL(sub.image)}
                        alt="preview"
                        style={{ maxWidth: "150px", display: "block" }}
                      />
                    )}
                  </div>
                ))
              )}
              {/* Add --OR-- separator between questions (except for the last question) */}
              {questionIndex < cieQuestions.length - 1 && (
                <p className="or-text">
                  <strong>-- OR --</strong>
                </p>
              )}
            </div>
          ))}

          {/* SEE Modules Preview - Only for SEE exam type */}
          {examType === "SEE" && modules.map((mod, modIndex) => (
            <div key={modIndex}>
              <h4>{mod.title}</h4>
              {mod.groups.length === 0 ? (
                <em>Pattern not selected yet</em>
              ) : (
                <>
                  {mod.groups[0].map((q, i) => (
                    <div key={i}>
                      {q.label}) {q.text} <strong>[{q.marks} marks]</strong>
                      <em> CO: {q.co || "N/A"}</em>
                      <em> | L: {q.level || "N/A"}</em>
                      {q.image && q.image instanceof File && (
                        <img
                          src={URL.createObjectURL(q.image)}
                          alt="preview"
                          style={{ maxWidth: "150px", display: "block" }}
                        />
                      )}
                    </div>
                  ))}
                  <p className="or-text">
                    <strong>-- OR --</strong>
                  </p>
                  {mod.groups[1].map((q, i) => (
                    <div key={i}>
                      {q.label}) {q.text} <strong>[{q.marks} marks]</strong>
                      <em> CO: {q.co || "N/A"}</em>
                      <em> | L: {q.level || "N/A"}</em>
                      {q.image && q.image instanceof File && (
                        <img
                          src={URL.createObjectURL(q.image)}
                          alt="preview"
                          style={{ maxWidth: "150px", display: "block" }}
                        />
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="action-buttons">
          {!isSubmitted && (
            <button 
              className="save-btn" 
              onClick={() => {
                saveDraftToLocalStorage();
                alert("💾 Draft saved successfully!");
              }}
            >
              💾 Save Draft
            </button>
          )}
          {!isSubmitted && (
            <button className="submit-btn" onClick={confirmAndSubmit}>
              📤 Submit Final
            </button>
          )}
          {!isSubmitted && (draftLoaded || lastSavedAt) && (
            <button className="clear-btn" onClick={clearDraft}>
              🗑️ Clear Draft
            </button>
          )}
          <button className="save-btn" onClick={downloadPreviewAsPdf}>
            ⬇️ Download PDF
          </button>
        </div>
        {isSubmitted && (
          <p className="submitted-text">
            ✅ Paper submitted. Editing is locked.
          </p>
        )}
      </div>
    </div>
  );
}

export default QuestionPaperBuilder;
