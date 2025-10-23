import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../App.css";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useLocation } from "react-router-dom";

function QuestionPaperBuilder() {
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
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

  const markPresets = {
    "a, b, c, d (5 marks each)": [5, 5, 5, 5],
    "a, b (10 marks each)": [10, 10],
    "a, b, c (7,7,6 marks)": [7, 7, 6],
    "a, b, c (8,8,4 marks)": [8, 8, 4],
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
   * 💾 Auto-save every 2 mins
   ------------------------- */
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (!isSubmitted) {
        saveQuestionPaper(true);
      }
    }, 2 * 60 * 1000);
    return () => clearInterval(autoSaveInterval);
  }, []);

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
      image: null, // store selected file
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

  /** ------------------------
   * ✅ Validation Function
   ------------------------- */
  const validatePaper = () => {
    if (!subject || !subjectCode || !semester) {
      alert("⚠️ Please fill subject code, name and semester.");
      return false;
    }
    const semNum = parseInt(String(semester).replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(semNum) || semNum < 1 || semNum > 8) {
      alert("⚠️ Semester must be a number between 1 and 8.");
      return false;
    }

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
   * 💾 Save or Submit
   ------------------------- */
  const saveQuestionPaper = async (isDraft = false) => {
    try {
      const now = new Date().toISOString();

      // Normalize semester to a plain number (1-8)
      const semNum = parseInt(String(semester).replace(/[^0-9]/g, ''), 10);

      for (let mod of modules) {
        for (let group of mod.groups) {
          for (let q of group) {
            if (q.text.trim() !== "") {
              const formData = new FormData();
              formData.append("subject_code", subjectCode);
              formData.append("subject_name", subject);
              formData.append("semester", semNum);
              formData.append("question_number", q.label);
              formData.append("question_text", q.text);
              formData.append("co", q.co);
              formData.append("level", q.level);
              formData.append("marks", q.marks);
              formData.append("faculty_email", facultyEmail);
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

      setLastSavedAt(now);
      if (!isDraft) {
        alert("✅ All questions submitted successfully!");
        setIsSubmitted(true);
      } else {
        console.log("Draft auto-saved at", now);
      }
    } catch (error) {
      console.error("Error saving question bank:", error && (error.response?.data || error.message));
      const msg = error?.response?.data?.error || "Failed to save questions.";
      alert(`❌ ${msg}`);
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
        <h1>📘 Question Paper Builder</h1>

        {lastSavedAt && (
          <p className="timestamp">
            Last saved at: {new Date(lastSavedAt).toLocaleString()}
          </p>
        )}

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
          <select
            value={String(semester)}
            onChange={(e) => setSemester(e.target.value)}
            disabled={isSubmitted}
          >
            <option value="">Select Semester</option>
            {[1,2,3,4,5,6,7,8].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
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

        <h3>📚 Modules</h3>
        {!isSubmitted && <button onClick={addEmptyModule}>➕ Add Module</button>}

        {modules.map((mod, modIndex) => (
          <div key={modIndex} className="module-box">
            <h4>{mod.title}</h4>
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
                      <input
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
                        placeholder="CO"
                        className="small"
                        disabled={isSubmitted}
                      />
                      <input
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
                        placeholder="L"
                        className="small"
                        disabled={isSubmitted}
                      />
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

                      {/* Image Upload */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          updateQuestion(
                            modIndex,
                            groupIndex,
                            qIndex,
                            "image",
                            e.target.files[0]
                          )
                        }
                        disabled={isSubmitted}
                      />
                      {q.image && (
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

          {modules.map((mod, modIndex) => (
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
                      {q.image && (
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
                      {q.image && (
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
            <button className="save-btn" onClick={() => saveQuestionPaper(true)}>
              💾 Save Draft
            </button>
          )}
          {!isSubmitted && (
            <button className="submit-btn" onClick={confirmAndSubmit}>
              📤 Submit Final
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
