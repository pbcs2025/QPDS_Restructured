import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../App.css";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useLocation } from "react-router-dom";
import MBAQuestionPaperBuilder from "./MBAQuestionPaperBuilder";

const MBA_SUB_LABELS = ["a", "b", "c"];

const createInitialMBAQuestions = () =>
  Array.from({ length: 8 }, (_, idx) => ({
    number: idx + 1,
    text: "",
    co: "",
    level: "",
    image: null,
    subQuestions: [],
  }));

function QuestionPaperBuilder() {
  const API_BASE = process.env.REACT_APP_API_BASE_URL;
  const location = useLocation();
  const [subject, setSubject] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [semester, setSemester] = useState("");
  const [instructions, setInstructions] = useState("");
  const [cos, setCOs] = useState(["CO1"]);
  const [modules, setModules] = useState([]);
  const [nextGroupNumber, setNextGroupNumber] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const inactivityTimer = useRef(null);
  const previewRef = useRef(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [facultyEmail, setFacultyEmail] = useState("");
  const [examType, setExamType] = useState("BE/MTECH");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [mbaQuestions, setMbaQuestions] = useState(() =>
    createInitialMBAQuestions()
  );

  const markPresets = {
    "a, b, c, d (5 marks each)": [5, 5, 5, 5],
    "a, b (10 marks each)": [10, 10],
    "a, b, c (7,7,6 marks)": [7, 7, 6],
    "a, b, c (8,8,4 marks)": [8, 8, 4],
  };

  // Helper function to convert File to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve({
        data: reader.result,
        name: file.name,
        type: file.type,
        size: file.size
      });
      reader.onerror = error => reject(error);
    });
  };

  // Helper function to convert base64 back to File
  const base64ToFile = (base64Data) => {
    if (!base64Data || typeof base64Data === 'string') return base64Data;
    
    const byteCharacters = atob(base64Data.data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], base64Data.name, { type: base64Data.type });
  };

  // CIE patterns removed as CIE flow is no longer supported

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
            console.log('📋 Assigned subjects data:', subjects); // Debug log
            setAssignedSubjects(subjects);
            
            // If state was passed from faculty dashboard, pre-select the subject
            if (location.state?.subjectCode) {
              const selectedSubject = subjects.find(sub => sub.subject_code === location.state.subjectCode);
              if (selectedSubject) {
                setSubjectCode(selectedSubject.subject_code);
                setSubject(selectedSubject.subject_name || "");
                // Handle semester with fallback
                const semesterValue = selectedSubject.semester || 1; // Default to 1 if missing
                setSemester(semesterValue.toString());
                console.log('🎯 Pre-selecting subject:', selectedSubject); // Debug log
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

  // Ensure CO1 is always present
  useEffect(() => {
    if (cos.length === 0) {
      setCOs(["CO1"]);
    }
  }, [cos.length]);

  /** ------------------------
   * 💾 Load Draft Data from localStorage
   ------------------------- */
  useEffect(() => {
    const loadDraftData = async () => {
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
            setCOs(draftData.cos || ["CO1"]);
            
            // Convert base64 images back to File objects for modules
            const modulesWithFiles = await Promise.all((draftData.modules || []).map(async mod => ({
              ...mod,
              groups: await Promise.all((mod.groups || []).map(async group => 
                await Promise.all((group || []).map(async q => ({
                  ...q,
                  image: q.image && typeof q.image === 'object' && q.image.data ? base64ToFile(q.image) : q.image
                })))
              ))
            })));

            const mbaQuestionsWithFiles = draftData.mbaQuestions
              ? await Promise.all(
                  draftData.mbaQuestions.map(async (question) => ({
                    ...question,
                    text:
                      question.subQuestions &&
                      question.subQuestions.length > 0
                        ? ""
                        : question.text || "",
                    image:
                      question.image &&
                      typeof question.image === "object" &&
                      question.image.data
                        ? base64ToFile(question.image)
                        : question.image,
                    subQuestions: await Promise.all(
                      (question.subQuestions || []).map(async (sub) => ({
                        ...sub,
                        image:
                          sub.image &&
                          typeof sub.image === "object" &&
                          sub.image.data
                            ? base64ToFile(sub.image)
                            : sub.image,
                      }))
                    ),
                  }))
                )
              : createInitialMBAQuestions();
            
            setModules(modulesWithFiles);
            setMbaQuestions(
              mbaQuestionsWithFiles.length === 8
                ? mbaQuestionsWithFiles
                : createInitialMBAQuestions()
            );
            setNextGroupNumber(draftData.nextGroupNumber || 1);
            setExamType(draftData.examType || "BE/MTECH");
            setIsSubmitted(draftData.isSubmitted || false);
            setDraftLoaded(true);
            
            console.log("📄 Draft data loaded successfully with File objects restored");
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
  }, [
    subject,
    subjectCode,
    semester,
    instructions,
    cos,
    modules,
    examType,
    isSubmitted,
    mbaQuestions,
  ]);

  /** ------------------------
   * 📌 Add / Update Functions
   ------------------------- */
  const addCO = () => {
    if (isSubmitted) return;
    if (cos.length >= 5) {
      alert("⚠️ Maximum 5 Course Outcomes (CO1-CO5) allowed.");
      return;
    }
    const nextCO = `CO${cos.length + 1}`;
    setCOs([...cos, nextCO]);
  };
  const updateCO = (i, val) => {
    if (isSubmitted) return;
    const updated = [...cos];
    updated[i] = val;
    setCOs(updated);
  };

  // Handle subject code selection and auto-populate subject name and semester
  const handleSubjectCodeChange = (selectedCode) => {
    if (isSubmitted) return;
    setSubjectCode(selectedCode);
    
    // Find the corresponding subject name and semester
    const selectedSubject = assignedSubjects.find(sub => sub.subject_code === selectedCode);
    console.log('🔍 Selected subject:', selectedSubject); // Debug log
    if (selectedSubject) {
      setSubject(selectedSubject.subject_name || "");
      // Handle semester with fallback
      const semesterValue = selectedSubject.semester || 1; // Default to 1 if missing
      setSemester(semesterValue.toString());
      console.log('📝 Setting semester to:', semesterValue); // Debug log
    } else {
      setSubject("");
      setSemester("");
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
    if (modules.length >= 5) {
      alert("⚠️ Maximum 5 modules allowed.");
      return;
    }
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

  const handleMBAQuestionChange = (questionIndex, key, value) => {
    if (isSubmitted) return;
    setMbaQuestions((prev) => {
      const updated = [...prev];
      const current = updated[questionIndex];
      if (!current) {
        return prev;
      }

      if (key === "text" && current.subQuestions.length > 0) {
        return prev;
      }

      updated[questionIndex] = {
        ...current,
        [key]: value,
      };
      return updated;
    });
  };

  const addMbaSubQuestion = (questionIndex) => {
    if (isSubmitted) return;
    setMbaQuestions((prev) => {
      const updated = [...prev];
      const selectedQuestion = updated[questionIndex];

      if (
        !selectedQuestion ||
        selectedQuestion.subQuestions.length >= MBA_SUB_LABELS.length
      ) {
        return prev;
      }

      const nextLabel =
        MBA_SUB_LABELS[selectedQuestion.subQuestions.length] || "a";

      const newSubQuestion = {
        label: nextLabel,
        text: "",
        co: "",
        level: "",
        marks: "",
        image: null,
      };

      updated[questionIndex] = {
        ...selectedQuestion,
        text:
          selectedQuestion.subQuestions.length === 0
            ? ""
            : selectedQuestion.text,
        subQuestions: [...selectedQuestion.subQuestions, newSubQuestion],
      };

      return updated;
    });
  };

  const handleMBASubQuestionChange = (
    questionIndex,
    subIndex,
    key,
    value
  ) => {
    if (isSubmitted) return;

    setMbaQuestions((prev) => {
      const updated = [...prev];
      const question = updated[questionIndex];

      if (!question || !question.subQuestions[subIndex]) {
        return prev;
      }

      const updatedSubQuestions = [...question.subQuestions];
      updatedSubQuestions[subIndex] = {
        ...updatedSubQuestions[subIndex],
        [key]: value,
      };

      updated[questionIndex] = {
        ...question,
        subQuestions: updatedSubQuestions,
      };

      return updated;
    });
  };

  // CIE actions removed as CIE flow is no longer supported

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

    if (examType === "BE/MTECH") {
      // Validate modules (BE/MTECH)
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
    } else if (examType === "MBA") {
      for (let question of mbaQuestions) {
        const hasSubs = question.subQuestions.length > 0;

        if (!hasSubs && !question.text.trim()) {
          alert(`⚠️ Please enter text for question Q${question.number}.`);
          return false;
        }

        if (hasSubs) {
          if (question.text.trim().length > 0) {
            alert(
              `⚠️ Q${question.number} should not have main text when sub-questions exist.`
            );
            return false;
          }

          const incompleteSub = question.subQuestions.some(
            (sub) => !sub.text.trim()
          );
          if (incompleteSub) {
            alert(
              `⚠️ Please fill all sub-questions for Q${question.number}.`
            );
            return false;
          }

          const totalSubMarks = question.subQuestions.reduce(
            (sum, sub) => sum + (parseInt(sub.marks, 10) || 0),
            0
          );

          if (totalSubMarks !== 20) {
            alert(
              `⚠️ Total marks for sub-questions in Q${question.number} must equal 20.`
            );
            return false;
          }
        }
      }
    }
    return true;
  };

  /** ------------------------
   * 💾 Save Draft to localStorage
   ------------------------- */
  const saveDraftToLocalStorage = async () => {
    try {
      const draftKey = `questionPaper_draft_${facultyEmail}`;
      
      // Convert File objects to base64 for storage
      const modulesForStorage = await Promise.all(modules.map(async mod => ({
        ...mod,
        groups: await Promise.all((mod.groups || []).map(async group => 
          await Promise.all((group || []).map(async q => ({
            ...q,
            image: q.image instanceof File ? await fileToBase64(q.image) : q.image
          })))
        ))
      })));

      const mbaQuestionsForStorage = await Promise.all(
        mbaQuestions.map(async (question) => ({
          ...question,
          image:
            question.image instanceof File
              ? await fileToBase64(question.image)
              : question.image,
          subQuestions: await Promise.all(
            (question.subQuestions || []).map(async (sub) => ({
              ...sub,
              image:
                sub.image instanceof File
                  ? await fileToBase64(sub.image)
                  : sub.image,
            }))
          ),
        }))
      );
      
      const draftData = {
        subject,
        subjectCode,
        semester,
        instructions,
        cos,
        modules: modulesForStorage,
        nextGroupNumber,
        examType,
        mbaQuestions: mbaQuestionsForStorage,
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
      await saveDraftToLocalStorage();

      // If it's just a draft, don't send to server
      if (isDraft) {
        console.log("Draft saved locally at", now);
        return;
      }

      const submitQuestionToServer = async ({
        questionNumber,
        questionText,
        co,
        level,
        marks,
        image,
      }) => {
        if (!questionText || !questionText.trim()) {
          return;
        }

        const formData = new FormData();
        formData.append("subject_code", subjectCode);
        formData.append("subject_name", subject);
        formData.append("semester", semester);
        formData.append("question_number", questionNumber);
        formData.append("question_text", questionText);
        formData.append("co", co || "");
        formData.append("level", level || "");
        formData.append("marks", marks ?? 0);
        formData.append("faculty_email", facultyEmail);
        formData.append("exam_type", examType);

        if (image && image instanceof File) {
          formData.append("file", image);
          console.log(
            `📎 Uploading file for question ${questionNumber}:`,
            image.name,
            image.size,
            "bytes"
          );
        } else if (image) {
          console.log(
            `⚠️ Question ${questionNumber} has image but it's not a File object:`,
            typeof image
          );
        }

        try {
          const response = await axios.post(
            `${API_BASE}/question-bank`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
          console.log(`✅ Question ${questionNumber} saved:`, response.data);
        } catch (error) {
          console.error(
            `❌ Error saving question ${questionNumber}:`,
            error.response?.data || error.message
          );
          throw new Error(
            `Failed to save question ${questionNumber}: ${
              error.response?.data?.error || error.message
            }`
          );
        }
      };

      if (examType === "BE/MTECH") {
        for (let mod of modules) {
          for (let group of mod.groups) {
            for (let q of group) {
              if (q.text.trim() !== "") {
                await submitQuestionToServer({
                  questionNumber: q.label,
                  questionText: q.text,
                  co: q.co,
                  level: q.level,
                  marks: q.marks,
                  image: q.image,
                });
              }
            }
          }
        }
      } else if (examType === "MBA") {
        for (let question of mbaQuestions) {
          if (question.subQuestions.length === 0) {
            await submitQuestionToServer({
              questionNumber: `Q${question.number}`,
              questionText: question.text,
              co: question.co,
              level: question.level,
              marks: 20,
              image: question.image,
            });
          } else {
            for (let sub of question.subQuestions) {
              await submitQuestionToServer({
                questionNumber: `Q${question.number}${sub.label}`,
                questionText: sub.text,
                co: sub.co,
                level: sub.level,
                marks: parseInt(sub.marks, 10) || 0,
                image: sub.image,
              });
            }
          }
        }
      } else {
        throw new Error(`Unsupported exam type: ${examType}`);
      }

      // Mark as submitted and clear draft
      setIsSubmitted(true);
      const draftKey = `questionPaper_draft_${facultyEmail}`;
      localStorage.removeItem(draftKey);
      
      // Update assignment status to submitted
      try {
        await axios.post(`${API_BASE}/assignments/update-status`, {
          email: facultyEmail,
          subjectCode: subjectCode
        });
        
        // Refresh assigned subjects to hide submitted one
        const response = await fetch(`${API_BASE}/faculty/subject-codes/${facultyEmail}`);
        const updatedSubjects = await response.json();
        setAssignedSubjects(updatedSubjects);
      } catch (error) {
        console.error('Error updating assignment status:', error);
      }
      
      alert("✅ All questions submitted successfully!");
    } catch (error) {
      console.error("❌ Error saving question bank:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Full error:", error);
      
      // Show detailed error message
      const errorMessage = error.message || "Unknown error occurred";
      alert(`❌ Failed to save questions: ${errorMessage}`);
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
      setCOs(["CO1"]);
      setModules([]);
      setNextGroupNumber(1);
      setExamType("BE/MTECH");
      setMbaQuestions(createInitialMBAQuestions());
      setIsSubmitted(false);
      setDraftLoaded(false);
      setLastSavedAt(null);
      
      alert("✅ Draft cleared successfully!");
    }
  };

  /** ------------------------
   * ⬇️ Download Preview as PDF
   * ------------------------- */
  
  /** ------------------------
   * 🎨 UI Rendering
   ------------------------- */
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Faculty Portal</h2>
        <p>Question Paper Builder</p>
      </div>

      <div
        className={`main-content${
          examType === "MBA" ? " mba-theme" : ""
        }`}
      >
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
            <option value="BE/MTECH">BE/MTECH</option>
            <option value="MBA">MBA</option>
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
              {assignedSubjects
                .filter(sub => sub.status !== 'submitted') // Hide submitted subjects
                .map((sub, index) => (
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
          {assignedSubjects.length > 0 ? (
            <select
              value={semester || ""}
              onChange={(e) => setSemester(e.target.value)}
              disabled={isSubmitted}
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              disabled={isSubmitted}
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          )}
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
            placeholder="Enter CO description"
            disabled={isSubmitted}
          />
        ))}
        {!isSubmitted && cos.length < 5 && <button onClick={addCO}>➕ Add CO</button>}
        {cos.length >= 5 && (
          <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
            ✅ Maximum Course Outcomes reached (CO1-CO5)
          </p>
        )}

        {examType === "BE/MTECH" && (
          <>
            <h3>📚 Modules</h3>
            {!isSubmitted && modules.length < 5 && <button onClick={addEmptyModule}>➕ Add Module</button>}
            {modules.length >= 5 && !isSubmitted && (
              <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
                ✅ Maximum Modules reached (5)
              </p>
            )}
          </>
        )}

        {examType === "MBA" && (
          <MBAQuestionPaperBuilder
            questions={mbaQuestions}
            onQuestionChange={handleMBAQuestionChange}
            onAddSubQuestion={addMbaSubQuestion}
            onSubQuestionChange={handleMBASubQuestionChange}
            isSubmitted={isSubmitted}
          />
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

        {examType === "BE/MTECH" && modules.map((mod, modIndex) => (
          <div key={modIndex} className="module-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>{mod.title}</h4>
              {/* Delete Module removed */}
            </div>
            {!mod.groups || mod.groups.length === 0 ? (
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
                      {q.image && (
                        <img
                          src={q.image instanceof File ? URL.createObjectURL(q.image) : 
                               (q.image && typeof q.image === 'object' && q.image.data) ? q.image.data : 
                               q.image}
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

        {/* CIE Questions Section removed */}

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

          {examType === "MBA" && (
            <p className="mba-preview-note">
             
            </p>
          )}

          {/* Modules Preview - Only for BE/MTECH exam type */}
          {examType === "BE/MTECH" && modules.map((mod, modIndex) => (
            <div key={modIndex}>
              <h4>{mod.title}</h4>
              {mod.groups.length === 0 ? (
                <em>Pattern not selected yet</em>
              ) : (
                <>
                  {(mod.groups[0] || []).map((q, i) => (
                    <div key={i}>
                      {q.label}) {q.text} <strong>[{q.marks} marks]</strong>
                      <em> CO: {q.co || "N/A"}</em>
                      <em> | L: {q.level || "N/A"}</em>
                      {q.image && (
                        <img
                          src={q.image instanceof File ? URL.createObjectURL(q.image) : 
                               (q.image && typeof q.image === 'object' && q.image.data) ? q.image.data : 
                               q.image}
                          alt="preview"
                          style={{ maxWidth: "150px", display: "block" }}
                        />
                      )}
                    </div>
                  ))}
                  <p className="or-text">
                    <strong>-- OR --</strong>
                  </p>
                  {(mod.groups[1] || []).map((q, i) => (
                    <div key={i}>
                      {q.label}) {q.text} <strong>[{q.marks} marks]</strong>
                      <em> CO: {q.co || "N/A"}</em>
                      <em> | L: {q.level || "N/A"}</em>
                      {q.image && (
                        <img
                          src={q.image instanceof File ? URL.createObjectURL(q.image) : 
                               (q.image && typeof q.image === 'object' && q.image.data) ? q.image.data : 
                               q.image}
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

          {examType === "MBA" &&
            mbaQuestions.map((question) => (
              <div key={question.number} className="mba-preview-card">
                <p>
                  <strong>Q{question.number}.</strong>{" "}
                  {!question.subQuestions.length && question.text}
                  <strong>
                    [
                    {question.subQuestions.length > 0
                      ? "20 marks (split)"
                      : "20 marks"}
                    ]
                  </strong>
                  <em> CO: {question.co || "N/A"}</em>
                  <em> | L: {question.level || "N/A"}</em>
                </p>
                {question.subQuestions.length > 0 && (
                  <ul>
                    {question.subQuestions.map((sub) => (
                      <li key={`${question.number}-${sub.label}`}>
                        {sub.label}) {sub.text}{" "}
                        <strong>[{sub.marks || 0} marks]</strong>
                        <em> CO: {sub.co || "N/A"}</em>
                        <em> | L: {sub.level || "N/A"}</em>
                      </li>
                    ))}
                  </ul>
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
