import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../App.css";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useLocation } from "react-router-dom";
import MBAQuestionPaperBuilder from "./MBAQuestionPaperBuilder";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MBA_SUB_LABELS = ["a", "b", "c"];
const BE_SUB_LABELS = ["a", "b", "c", "d"];

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

  // basic state
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
  
  // Quill Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const editorTimerRef = useRef(null);

  // Quill modules configuration (Word-like toolbar)
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  };

  const quillFormats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  // helpers for file <-> base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () =>
        resolve({
          data: reader.result,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      reader.onerror = (error) => reject(error);
    });

  const base64ToFile = (base64Data) => {
    if (!base64Data || typeof base64Data === "string") return base64Data;
    const byteCharacters = atob(base64Data.data.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], base64Data.name, { type: base64Data.type });
  };

  // load faculty and assigned subjects
  useEffect(() => {
    const storedFacultyData = localStorage.getItem("faculty_data");
    if (storedFacultyData) {
      const data = JSON.parse(storedFacultyData);
      setFacultyEmail(data.email);
      if (data.email) {
        fetch(`${API_BASE}/faculty/subject-codes/${data.email}`)
          .then((res) => res.json())
          .then((subjects) => {
            setAssignedSubjects(subjects);
            if (location.state?.subjectCode) {
              const selectedSubject = subjects.find(
                (sub) => sub.subject_code === location.state.subjectCode
              );
              if (selectedSubject) {
                setSubjectCode(selectedSubject.subject_code);
                setSubject(selectedSubject.subject_name || "");
                setSemester((selectedSubject.semester || 1).toString());
              }
            }
          })
          .catch((err) => {
            console.error("Error fetching assigned subjects:", err);
            setAssignedSubjects([]);
          });
      }
    }
  }, [API_BASE, location.state]);

  useEffect(() => {
    if (cos.length === 0) setCOs(["CO1"]);
  }, [cos.length]);

  // load draft from localStorage
  useEffect(() => {
    const loadDraftData = async () => {
      try {
        const draftKey = `questionPaper_draft_${facultyEmail}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft);
          if (!draftData.isSubmitted) {
            setSubject(draftData.subject || "");
            setSubjectCode(draftData.subjectCode || "");
            setSemester(draftData.semester || "");
            setInstructions(draftData.instructions || "");
            setCOs(draftData.cos || ["CO1"]);

            const modulesWithFiles = await Promise.all(
              (draftData.modules || []).map(async (mod) => ({
                ...mod,
                questions: await Promise.all(
                  (mod.questions || []).map(async (q) => ({
                    ...q,
                    image:
                      q.image && typeof q.image === "object" && q.image.data
                        ? base64ToFile(q.image)
                        : q.image,
                    subQuestions: q.subQuestions
                      ? await Promise.all(
                          (q.subQuestions || []).map(async (sub) => ({
                            ...sub,
                            image:
                              sub.image &&
                              typeof sub.image === "object" &&
                              sub.image.data
                                ? base64ToFile(sub.image)
                                : sub.image,
                          }))
                        )
                      : [],
                  }))
                ),
              }))
            );

            const mbaQuestionsWithFiles = draftData.mbaQuestions
              ? await Promise.all(
                  draftData.mbaQuestions.map(async (question) => ({
                    ...question,
                    text:
                      question.subQuestions && question.subQuestions.length > 0
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
            console.log("Draft restored");
          }
        }
      } catch (err) {
        console.error("Error loading draft:", err);
      }
    };

    if (facultyEmail) loadDraftData();
  }, [facultyEmail]);

  // inactivity timer - auto-save on timeout
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
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      clearTimeout(inactivityTimer.current);
    };
  }, []);

  // auto save every 2 minutes
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (!isSubmitted) {
        saveDraftToLocalStorage();
        console.log("Auto-saved draft");
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

  // CO handlers
  const addCO = () => {
    if (isSubmitted) return;
    if (cos.length >= 5) {
      alert("Maximum 5 Course Outcomes (CO1-CO5) allowed.");
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

  const handleSubjectCodeChange = (selectedCode) => {
    if (isSubmitted) return;
    setSubjectCode(selectedCode);
    const selectedSubject = assignedSubjects.find(
      (sub) => sub.subject_code === selectedCode
    );
    if (selectedSubject) {
      setSubject(selectedSubject.subject_name || "");
      setSemester((selectedSubject.semester || 1).toString());
    } else {
      setSubject("");
      setSemester("");
    }
  };

  /** BE/MTECH pattern functions **/

  // Create a question with NO sub-questions initially (Option B behavior)
  const createBEQuestionEmpty = (labelNumber) => ({
    label: `${labelNumber}`,
    text: "",
    co: "",
    level: "",
    image: null,
    marks: 20, // main marks default when no subquestions
    subQuestions: [], // start empty
  });

  // Add a module (max 5). Each module contains two questions (Qn and Qn+1).
  const addEmptyModule = () => {
    if (isSubmitted) return;
    if (modules.length >= 5) {
      alert("Maximum 5 modules allowed.");
      return;
    }
    const baseQuestionNumber = modules.length * 2 + 1;
    const newModule = {
      title: `Module ${modules.length + 1}`,
      questions: [
        createBEQuestionEmpty(baseQuestionNumber),
        createBEQuestionEmpty(baseQuestionNumber + 1),
      ],
    };
    setModules([...modules, newModule]);
    setNextGroupNumber(nextGroupNumber + 1);
  };

  // Add a sub-question to a question (a -> b -> c -> d). Manual marks allowed.
  const addSubQuestionToBE = (modIndex, qIndex) => {
    if (isSubmitted) return;
    const updatedModules = [...modules];
    const question = updatedModules[modIndex].questions[qIndex];
    if (!question.subQuestions) question.subQuestions = [];
    if (question.subQuestions.length >= BE_SUB_LABELS.length) {
      alert("Maximum sub-questions reached (a-d).");
      return;
    }
    const nextLabel = BE_SUB_LABELS[question.subQuestions.length];
    question.subQuestions.push({
      label: nextLabel,
      text: "",
      marks: "", // manual marks (user types)
      image: null,
    });
    // disable main marks/text while sub-questions exist
    question.marks = "";
    question.text = "";
    setModules(updatedModules);
  };

  // convert question back to main (clear sub-questions)
  const convertToMainQuestion = (modIndex, qIndex) => {
    if (isSubmitted) return;
    const updatedModules = [...modules];
    const question = updatedModules[modIndex].questions[qIndex];
    question.subQuestions = [];
    question.marks = 20;
    setModules(updatedModules);
  };

  // update sub-question fields; ensure total <= 20 while editing
  const updateBESubQuestion = (modIndex, qIndex, subIndex, key, value) => {
    if (isSubmitted) return;
    const updatedModules = [...modules];
    const question = updatedModules[modIndex].questions[qIndex];

    // if updating marks, ensure numbers
    if (key === "marks") {
      const newMarks = value === "" ? "" : parseInt(value, 10);
      if (value !== "" && (isNaN(newMarks) || newMarks < 0)) return;
      // compute tentative total
      let total = 0;
      question.subQuestions.forEach((s, i) => {
        if (i === subIndex) {
          total += newMarks || 0;
        } else {
          total += parseInt(s.marks, 10) || 0;
        }
      });
      if (total > 20) {
        alert("Total sub-question marks cannot exceed 20.");
        return;
      }
      question.subQuestions[subIndex][key] = value === "" ? "" : newMarks;
    } else {
      question.subQuestions[subIndex][key] = value;
    }
    setModules(updatedModules);
  };

  // update main question fields (only allowed when no sub-questions)
  const updateBEQuestion = (modIndex, qIndex, key, val) => {
    if (isSubmitted) return;
    const updatedModules = [...modules];
    const q = updatedModules[modIndex].questions[qIndex];
    if ((key === "text" || key === "marks") && q.subQuestions && q.subQuestions.length > 0) {
      // not allowed while sub-questions exist
      return;
    }
    // if marks, ensure numeric
    if (key === "marks") {
      const v = val === "" ? "" : parseInt(val, 10);
      if (val !== "" && (isNaN(v) || v < 0)) return;
      q[key] = v;
    } else {
      q[key] = val;
    }
    setModules(updatedModules);
  };

  /** Validation **/
  const validatePaper = () => {
    if (!subject || !subjectCode || !semester) {
      alert("Please fill subject code, name and semester.");
      return false;
    }

    if (examType === "BE/MTECH") {
      for (let modIdx = 0; modIdx < modules.length; modIdx++) {
        const mod = modules[modIdx];
        if (!mod.questions || mod.questions.length === 0) continue;

        for (let qIdx = 0; qIdx < mod.questions.length; qIdx++) {
          const q = mod.questions[qIdx];

          if (q.subQuestions && q.subQuestions.length > 0) {
            // all sub-question text must be filled
            const incompleteSub = q.subQuestions.some(
              (sub) => !sub.text || !sub.text.trim()
            );
            if (incompleteSub) {
              alert(`Please fill all sub-questions for question ${q.label} in ${mod.title}.`);
              return false;
            }
            const totalSubMarks = q.subQuestions.reduce(
              (sum, sub) => sum + (parseInt(sub.marks, 10) || 0),
              0
            );
            // require total exactly 20 to match exam pattern
            if (totalSubMarks !== 20) {
              alert(`Total marks for sub-questions in Q${q.label} (${mod.title}) must equal 20. Current total: ${totalSubMarks}`);
              return false;
            }
            // main text should be empty
            if (q.text && q.text.trim().length > 0) {
              alert(`Question ${q.label} should not have main text when sub-questions exist.`);
              return false;
            }
            // CO & Level must be set at question level when sub-questions exist
            if (!q.co || !q.level) {
              alert(`Please select CO and Level for question ${q.label} in ${mod.title}. (CO & Level apply to the whole question)`);
              return false;
            }
          } else {
            // No subquestions: require main text and marks=20 and CO/Level
            if (!q.text || !q.text.trim()) {
              alert(`Please enter text for question ${q.label} in ${mod.title}.`);
              return false;
            }
            if ((parseInt(q.marks, 10) || 0) !== 20) {
              alert(`Question ${q.label} in ${mod.title} should have 20 marks when no sub-questions exist.`);
              return false;
            }
            if (!q.co || !q.level) {
              alert(`Please select CO and Level for question ${q.label} in ${mod.title}.`);
              return false;
            }
          }
        }
      }
    } else if (examType === "MBA") {
      for (let question of mbaQuestions) {
        const hasSubs = question.subQuestions.length > 0;
        if (!hasSubs && !question.text.trim()) {
          alert(`Please enter text for question Q${question.number}.`);
          return false;
        }
        if (hasSubs) {
          if (question.text.trim().length > 0) {
            alert(`Q${question.number} should not have main text when sub-questions exist.`);
            return false;
          }
          const incompleteSub = question.subQuestions.some((sub) => !sub.text.trim());
          if (incompleteSub) {
            alert(`Please fill all sub-questions for Q${question.number}.`);
            return false;
          }
          const totalSubMarks = question.subQuestions.reduce((sum, sub) => sum + (parseInt(sub.marks, 10) || 0), 0);
          if (totalSubMarks !== 20) {
            alert(`Total marks for sub-questions in Q${question.number} must equal 20.`);
            return false;
          }
        }
      }
    }

    return true;
  };

  /** Save draft **/
  const saveDraftToLocalStorage = async () => {
    try {
      const draftKey = `questionPaper_draft_${facultyEmail}`;

      const modulesForStorage = await Promise.all(
        modules.map(async (mod) => ({
          ...mod,
          questions: await Promise.all(
            (mod.questions || []).map(async (q) => ({
              ...q,
              image: q.image instanceof File ? await fileToBase64(q.image) : q.image,
              subQuestions: q.subQuestions
                ? await Promise.all((q.subQuestions || []).map(async (sub) => ({
                    ...sub,
                    image: sub.image instanceof File ? await fileToBase64(sub.image) : sub.image,
                  })))
                : [],
            }))
          ),
        }))
      );

      const mbaQuestionsForStorage = await Promise.all(
        mbaQuestions.map(async (question) => ({
          ...question,
          image: question.image instanceof File ? await fileToBase64(question.image) : question.image,
          subQuestions: await Promise.all((question.subQuestions || []).map(async (sub) => ({
            ...sub,
            image: sub.image instanceof File ? await fileToBase64(sub.image) : sub.image,
          }))),
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
        lastSavedAt: new Date().toISOString(),
      };

      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastSavedAt(new Date().toISOString());
      console.log("Draft saved to localStorage");
    } catch (error) {
      console.error("Error saving draft to localStorage:", error);
    }
  };

  /** Submit **/
  const saveQuestionPaper = async (isDraft = false) => {
    try {
      const now = new Date().toISOString();
      await saveDraftToLocalStorage();
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
        if (!questionText || !questionText.trim()) return;

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
        }

        try {
          const response = await axios.post(`${API_BASE}/question-bank`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          console.log(`Saved: ${questionNumber}`, response.data);
        } catch (error) {
          console.error(`Error saving ${questionNumber}:`, error.response?.data || error.message);
          throw new Error(`Failed to save ${questionNumber}`);
        }
      };

      if (examType === "BE/MTECH") {
        for (let mod of modules) {
          if (!mod.questions || mod.questions.length === 0) continue;
          for (let q of mod.questions) {
            if (q.subQuestions && q.subQuestions.length > 0) {
              for (let sub of q.subQuestions) {
                if (sub.text && sub.text.trim() !== "") {
                  await submitQuestionToServer({
                    questionNumber: `${q.label}${sub.label}`,
                    questionText: sub.text,
                    co: q.co || "",
                    level: q.level || "",
                    marks: parseInt(sub.marks, 10) || 0,
                    image: sub.image,
                  });
                }
              }
            } else {
              if (q.text && q.text.trim() !== "") {
                await submitQuestionToServer({
                  questionNumber: q.label,
                  questionText: q.text,
                  co: q.co || "",
                  level: q.level || "",
                  marks: q.marks || 20,
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

      setIsSubmitted(true);
      const draftKey = `questionPaper_draft_${facultyEmail}`;
      localStorage.removeItem(draftKey);

      // Update assignment status (best-effort)
      try {
        await axios.post(`${API_BASE}/assignments/update-status`, {
          email: facultyEmail,
          subjectCode: subjectCode,
        });
        const response = await fetch(`${API_BASE}/faculty/subject-codes/${facultyEmail}`);
        const updatedSubjects = await response.json();
        setAssignedSubjects(updatedSubjects);
      } catch (err) {
        console.error("Error updating assignment status:", err);
      }

      alert("All questions submitted successfully!");
    } catch (error) {
      console.error("Error saving question bank:", error);
      alert(`Failed to save questions: ${error.message || error}`);
    }
  };

  const confirmAndSubmit = () => {
    if (!validatePaper()) return;
    if (window.confirm("Are you sure you want to submit? Editing will be locked.")) {
      saveQuestionPaper(false);
    }
  };

  const clearDraft = () => {
    if (!window.confirm("Clear saved draft? This cannot be undone.")) return;
    const draftKey = `questionPaper_draft_${facultyEmail}`;
    localStorage.removeItem(draftKey);
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
    alert("Draft cleared successfully!");
  };

  // Helper for formatting marks into Option B "(05 Marks)" style
  const formatMarksOptionB = (marks) => {
    if (marks === "" || marks === null || marks === undefined) return "(00 Marks)";
    const num = parseInt(marks, 10) || 0;
    const padded = String(num).padStart(2, "0");
    return `(${padded} Marks)`;
  };

  // Quill Editor functions
  const openEditor = () => {
    if (isSubmitted) return;
    setEditorContent("");
    setEditorOpen(true);
    
    // Auto-close timer (2 minutes)
    editorTimerRef.current = setTimeout(() => {
      closeEditor();
      alert("Editor closed automatically after 2 minutes of inactivity.");
    }, 2 * 60 * 1000);
  };

  const closeEditor = () => {
    if (editorTimerRef.current) {
      clearTimeout(editorTimerRef.current);
    }
    setEditorOpen(false);
    setEditorContent("");
  };

  const copyToClipboard = () => {
    // Strip HTML tags and copy plain text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = editorContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    navigator.clipboard.writeText(plainText).then(() => {
      alert("✅ Content copied to clipboard! You can now paste it into any question field.");
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert("❌ Failed to copy to clipboard. Please try again.");
    });
  };

  /** Render **/
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Faculty Portal</h2>
        <p>Question Paper Builder</p>
      </div>

      <div className={`main-content${examType === "MBA" ? " mba-theme" : ""}`}>
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
          <p className="timestamp">Last saved at: {new Date(lastSavedAt).toLocaleString()}</p>
        )}

        <div className="exam-type-selection">
          <label>Exam Type:</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} disabled={isSubmitted}>
            <option value="BE/MTECH">BE/MTECH</option>
            <option value="MBA">MBA</option>
          </select>
        </div>

        <div className="student-info">
          <label>Subject Code:</label>
          {assignedSubjects.length > 0 ? (
            <select value={subjectCode} onChange={(e) => handleSubjectCodeChange(e.target.value)} disabled={isSubmitted}>
              <option value="">Select Assigned Subject Code</option>
              {assignedSubjects.filter(sub => sub.status !== 'submitted').map((sub, index) => (
                <option key={index} value={sub.subject_code}>{sub.subject_code}</option>
              ))}
            </select>
          ) : (
            <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="No assigned subjects" disabled={true} />
          )}

          <label>Subject Name:</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Auto-populated from selected subject code" disabled={isSubmitted} />

          <label>Semester:</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)} disabled={isSubmitted}>
            <option value="">Select Semester</option>
            {[1,2,3,4,5,6,7,8].map((sem) => <option key={sem} value={sem}>{sem}</option>)}
          </select>
        </div>

        <label>Student Instructions:</label>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Write general instructions here" disabled={isSubmitted} />

        <h3>📌 Course Outcomes (COs)</h3>
        {cos.map((co, i) => (
          <input key={i} value={co} onChange={(e) => updateCO(i, e.target.value)} placeholder="Enter CO description" disabled={isSubmitted} />
        ))}
        {!isSubmitted && cos.length < 5 && <button onClick={addCO}>➕ Add CO</button>}
        {cos.length >= 5 && <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>✅ Maximum Course Outcomes reached (CO1-CO5)</p>}

        {examType === "BE/MTECH" && (
          <>
            <h3>📚 Modules</h3>
            {!isSubmitted && modules.length < 5 && <button onClick={addEmptyModule}>➕ Add Module</button>}
            {modules.length >= 5 && !isSubmitted && <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>✅ Maximum Modules reached (5)</p>}
          </>
        )}

        {examType === "MBA" && (
          <MBAQuestionPaperBuilder
            questions={mbaQuestions}
            onQuestionChange={() => {}}
            onAddSubQuestion={() => {}}
            onSubQuestionChange={() => {}}
            isSubmitted={isSubmitted}
          />
        )}

        {/* BE/MTECH Module Editor */}
        {examType === "BE/MTECH" && modules.map((mod, modIndex) => (
          <div key={modIndex} className="module-box" style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>{mod.title}</h4>
            </div>

            {mod.questions.map((q, qIndex) => {
              const hasSubs = q.subQuestions && q.subQuestions.length > 0;
              const totalSubMarks = hasSubs ? q.subQuestions.reduce((s, sub) => s + (parseInt(sub.marks,10)||0), 0) : 0;

              return (
                <div key={qIndex} style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '16px' }}>{q.label})</strong>

                    {/* Main question text - disabled when sub-questions exist */}
                    <input
                      value={q.text}
                      onChange={(e) => updateBEQuestion(modIndex, qIndex, "text", e.target.value)}
                      placeholder={hasSubs ? "Main question disabled while sub-questions exist" : "Question text"}
                      disabled={isSubmitted || hasSubs}
                      style={{ flex: 1, minWidth: '240px', padding: '8px' }}
                    />

                    {/* CO & Level are at question level (apply to whole Q) */}
                    <select value={q.co || ""} onChange={(e) => updateBEQuestion(modIndex, qIndex, "co", e.target.value)} disabled={isSubmitted} className="small">
                      <option value="">CO</option>
                      <option value="CO1">CO1</option>
                      <option value="CO2">CO2</option>
                      <option value="CO3">CO3</option>
                      <option value="CO4">CO4</option>
                      <option value="CO5">CO5</option>
                    </select>

                    <select value={q.level || ""} onChange={(e) => updateBEQuestion(modIndex, qIndex, "level", e.target.value)} disabled={isSubmitted} className="small">
                      <option value="">Level</option>
                      <option value="L1">L1</option>
                      <option value="L2">L2</option>
                      <option value="L3">L3</option>
                      <option value="L4">L4</option>
                      <option value="L5">L5</option>
                    </select>

                    {/* Main marks only when NO sub-questions */}
                    {!hasSubs ? (
                      <input type="number" value={q.marks || ""} onChange={(e) => updateBEQuestion(modIndex, qIndex, "marks", e.target.value)} placeholder="20 marks" disabled={isSubmitted} style={{ width: "100px" }} />
                    ) : (
                      <div style={{ minWidth: "100px", fontSize: "14px" }}>
                        <strong>Total:</strong> {totalSubMarks}/20
                      </div>
                    )}

                    {/* sub-question button */}
                    {!isSubmitted && (
                      <button onClick={() => addSubQuestionToBE(modIndex, qIndex)} style={{ padding: '6px 10px' }}>
                        ➕ Add sub-question
                      </button>
                    )}

                    <input type="file" accept="image/*" onChange={(e) => {
                      const updated = [...modules];
                      updated[modIndex].questions[qIndex].image = e.target.files[0] || null;
                      setModules(updated);
                    }} disabled={isSubmitted} style={{ fontSize: '12px' }} />
                  </div>

                  {q.image && (
                    <img src={q.image instanceof File ? URL.createObjectURL(q.image) : (q.image && typeof q.image === 'object' && q.image.data ? q.image.data : q.image)} alt="question" style={{ maxWidth: '150px', display: 'block', marginTop: '8px' }} />
                  )}

                  {/* Sub-questions editor */}
                  {hasSubs && (
                    <div style={{ marginLeft: '28px', marginTop: '12px', padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong>Sub-Questions</strong>
                        <div style={{ fontWeight: 'bold', color: totalSubMarks === 20 ? 'green' : totalSubMarks > 20 ? 'red' : 'orange' }}>{totalSubMarks}/20</div>
                      </div>

                      {q.subQuestions.map((sub, subIndex) => (
                        <div key={subIndex} style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ width: "30px", fontWeight: 'bold' }}>{q.label}{sub.label})</div>
                          <input value={sub.text} onChange={(e) => updateBESubQuestion(modIndex, qIndex, subIndex, "text", e.target.value)} placeholder="Sub-question text" disabled={isSubmitted} style={{ flex: 1, minWidth: '220px', padding: '6px' }} />
                          <input type="number" value={sub.marks} onChange={(e) => updateBESubQuestion(modIndex, qIndex, subIndex, "marks", e.target.value)} placeholder="Marks" disabled={isSubmitted} style={{ width: '80px' }} />
                          <input type="file" accept="image/*" onChange={(e) => {
                            const updated = [...modules];
                            updated[modIndex].questions[qIndex].subQuestions[subIndex].image = e.target.files[0] || null;
                            setModules(updated);
                          }} disabled={isSubmitted} style={{ fontSize: '12px' }} />
                        </div>
                      ))}

                      {totalSubMarks > 20 && (
                        <div style={{ marginTop: '8px', color: 'red', fontWeight: 'bold', backgroundColor: '#ffebee', padding: '6px', borderRadius: '4px' }}>
                          ⚠️ Warning: Total marks exceed 20!
                        </div>
                      )}

                      {!isSubmitted && (
                        <div style={{ marginTop: '8px' }}>
                          <button onClick={() => convertToMainQuestion(modIndex, qIndex)} style={{ padding: '6px 10px' }}>Convert to main question</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <hr />
        <h2>🖨 Question Paper Preview</h2>
        <div className="preview" ref={previewRef} style={{ padding: '12px', backgroundColor: '#fff' }}>
          <p><strong>Subject:</strong> {subject} ({subjectCode})</p>
          <p><strong>Semester:</strong> {semester || "[Semester]"}</p>
          <p>{instructions}</p>

          <h4>Course Outcomes:</h4>
          <div>
            {cos.map((co, i) => <div key={i}>{co}</div>)}
          </div>

          {/* BE/MTECH Preview */}
          {examType === "BE/MTECH" && modules.map((mod, modIndex) => (
            <div key={modIndex} style={{ marginTop: '18px' }}>
              <h4 style={{ marginBottom: '6px' }}>{mod.title}</h4>

              {mod.questions.map((q, qIdx) => {
                const hasSubs = q.subQuestions && q.subQuestions.length > 0;
                const totalSubMarks = hasSubs ? q.subQuestions.reduce((s, sub) => s + (parseInt(sub.marks,10)||0), 0) : 0;

                return (
                  <div key={qIdx} style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold' }}>
                      {q.label}.
                    </div>

                    {hasSubs ? (
                      <div style={{ marginLeft: '18px', marginTop: '6px' }}>
                        {q.subQuestions.map((sub, si) => (
                          <div key={si} style={{ marginBottom: '6px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <div style={{ minWidth: '40px', fontWeight: 'bold' }}>{q.label}{sub.label})</div>
                            <div style={{ flex: 1 }}>{sub.text || "__________"}</div>
                            <div style={{ minWidth: '120px', textAlign: 'right', fontWeight: 'bold' }}>{formatMarksOptionB(sub.marks)}</div>
                          </div>
                        ))}

                        {/* CO & Level for whole question */}
                        <div style={{ marginTop: '6px' }}>
                          <strong>CO:</strong> {q.co || "N/A"} &nbsp; <strong>Level:</strong> {q.level || "N/A"}
                        </div>

                      </div>
                    ) : (
                      <div style={{ marginLeft: '18px', marginTop: '6px' }}>
                        <div>{q.text || "__________"}</div>
                        <div style={{ marginTop: '6px', fontWeight: 'bold' }}>Marks: {q.marks || 20}</div>
                        <div style={{ marginTop: '6px' }}><strong>CO:</strong> {q.co || "N/A"} &nbsp; <strong>Level:</strong> {q.level || "N/A"}</div>
                      </div>
                    )}

                    {qIdx === 0 && <div style={{ marginTop: '8px', marginBottom: '8px', textAlign: 'center', fontWeight: 'bold' }}>OR</div>}
                  </div>
                );
              })}
            </div>
          ))}

          {/* MBA preview */}
          {examType === "MBA" && mbaQuestions.map((question) => (
            <div key={question.number} className="mba-preview-card" style={{ marginTop: '10px' }}>
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
                      {sub.label}) {sub.text} <strong>[{sub.marks || 0} marks]</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="action-buttons" style={{ marginTop: '14px' }}>
          {!isSubmitted && (
            <button className="save-btn" onClick={() => { saveDraftToLocalStorage(); alert("Draft saved successfully!"); }}>💾 Save Draft</button>
          )}
          {!isSubmitted && (
            <button className="submit-btn" onClick={confirmAndSubmit}>📤 Submit Final</button>
          )}
          {!isSubmitted && (
            <button 
              className="editor-btn" 
              onClick={openEditor}
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                marginLeft: '10px'
              }}
            >
              ✏️ Open Editor
            </button>
          )}
          {!isSubmitted && (draftLoaded || lastSavedAt) && (
            <button className="clear-btn" onClick={clearDraft}>🗑️ Clear Draft</button>
          )}
        </div>

        {isSubmitted && <p className="submitted-text">✅ Paper submitted. Editing is locked.</p>}
      </div>

      {/* React-Quill Editor Popup */}
      {editorOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '95%',
            maxWidth: '1200px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{ 
              padding: '20px 24px',
              borderBottom: '2px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>✏️ Word-like Question Editor</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
                  Write your question with rich formatting • Auto-closes in 2 minutes
                </p>
              </div>
              <button 
                onClick={closeEditor}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#666';
                }}
              >
                ×
              </button>
            </div>
            
            {/* Editor Area */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto',
              padding: '20px',
              backgroundColor: '#fff'
            }}>
              <ReactQuill
                theme="snow"
                value={editorContent}
                onChange={setEditorContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Start typing your question here... You can format text, add lists, insert images, and more!"
                style={{
                  height: 'calc(100% - 60px)',
                  fontSize: '16px'
                }}
              />
            </div>
            
            {/* Footer with Actions */}
            <div style={{ 
              padding: '16px 24px',
              borderTop: '2px solid #e0e0e0',
              display: 'flex',
              gap: '12px',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px'
            }}>
              <div style={{ fontSize: '13px', color: '#666' }}>
                💡 Tip: Copy the content and paste it into any question field above
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={closeEditor}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#fff',
                    color: '#333',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.borderColor = '#999';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={copyToClipboard}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#45a049';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#4CAF50';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestionPaperBuilder;
