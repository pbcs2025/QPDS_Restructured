import React from "react";

const CO_OPTIONS = ["CO1", "CO2", "CO3", "CO4", "CO5"];
const LEVEL_OPTIONS = ["L1", "L2", "L3", "L4", "L5"];
const SUB_LABELS = ["a", "b", "c"];

const sumSubQuestionMarks = (subQuestions = []) =>
  subQuestions.reduce(
    (sum, sub) => sum + (parseInt(sub.marks, 10) || 0),
    0
  );

const getImageSource = (image) => {
  if (!image) return null;
  if (image instanceof File) {
    return URL.createObjectURL(image);
  }
  if (typeof image === "object" && image.data) {
    return image.data;
  }
  return image;
};

function MBAQuestionPaperBuilder({
  questions,
  onQuestionChange,
  onAddSubQuestion,
  onSubQuestionChange,
  isSubmitted,
}) {
  return (
    <div className="mba-builder">
      <div className="mba-instructions-banner">
        
      </div>

      {questions.map((question, index) => {
        const totalAllocated = sumSubQuestionMarks(question.subQuestions);
        const nextSubLabel = SUB_LABELS[question.subQuestions.length];
        const hasSubQuestions = question.subQuestions.length > 0;
        const exceedsLimit = totalAllocated > 20;
        const incompleteMarks =
          hasSubQuestions && totalAllocated !== 20;

        return (
          <div className="mba-question-card" key={question.number}>
            <div className="mba-question-header">
              <h4>Q{question.number}</h4>
              <span className="mba-total-marks">Total: 20 marks</span>
            </div>

            {!hasSubQuestions ? (
              <textarea
                value={question.text}
                onChange={(e) =>
                  onQuestionChange(index, "text", e.target.value)
                }
                placeholder="Type the 20-mark question"
                disabled={isSubmitted}
              />
            ) : (
              <div className="mba-main-question-locked">
                Main question is hidden because sub-questions are enabled.
              </div>
            )}

            {/* Main question metadata */}
            <div className="mba-main-meta">
               <div>
                 <label>CO</label>
                 <select
                   value={question.co}
                   onChange={(e) =>
                     onQuestionChange(index, "co", e.target.value)
                   }
                   disabled={isSubmitted}
                 >
                   <option value="">Select CO</option>
                   {CO_OPTIONS.map((co) => (
                     <option key={co} value={co}>
                       {co}
                     </option>
                   ))}
                 </select>
               </div>
               <div>
                 <label>Level</label>
                 <select
                   value={question.level}
                   onChange={(e) =>
                     onQuestionChange(index, "level", e.target.value)
                   }
                   disabled={isSubmitted}
                 >
                   <option value="">Select Level</option>
                   {LEVEL_OPTIONS.map((level) => (
                     <option key={level} value={level}>
                       {level}
                     </option>
                   ))}
                 </select>
               </div>

               {/* Main marks only shown when no sub-questions */}
               {!hasSubQuestions && (
                 <div>
                   <label>Marks</label>
                   <input type="number" value={20} readOnly />
                 </div>
               )}
            </div>

            {/* Main question image */}
            <div className="mba-file-upload">
              <label>Reference Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  onQuestionChange(index, "image", e.target.files[0] || null)
                }
                disabled={isSubmitted}
              />
              {question.image && (
                <img
                  src={getImageSource(question.image)}
                  alt="mba-question"
                />
              )}
            </div>

            {/* Sub questions */}
            <div className="mba-sub-section">
              <div className="mba-sub-header">
                <h5>Sub-questions</h5>
                <p>
               {!hasSubQuestions
                 ? "Main question carries full 20 marks."
                 : `Marks allocated: ${totalAllocated}/20`}
                </p>
              </div>

              {/* VALIDATION MESSAGES */}
              {exceedsLimit && (
                <p style={{ color: "red", fontWeight: "bold" }}>
                  Total marks for sub-questions cannot exceed 20.
                </p>
              )}

              {question.subQuestions.length > 0 &&
                !exceedsLimit &&
                totalAllocated !== 20 && (
                  <p style={{ color: "orange", fontWeight: "bold" }}>
                    Total must be exactly 20 marks.
                  </p>
                )}

              {question.subQuestions.map((sub, subIndex) => (
                <div className="mba-sub-card" key={`${question.number}-${sub.label}`}>
                  <div className="mba-sub-card-header">
                    <strong>{sub.label})</strong>
                    <span>
                      {sub.marks
                        ? `${sub.marks} marks`
                        : "Set marks for this sub-question"}
                    </span>
                  </div>

                  <textarea
                    value={sub.text}
                    onChange={(e) =>
                      onSubQuestionChange(
                        index,
                        subIndex,
                        "text",
                        e.target.value
                      )
                    }
                    placeholder={`Enter text for sub-question ${sub.label}`}
                    disabled={isSubmitted}
                  />

                  {/* Sub question meta WITHOUT CO & LEVEL */}
                  <div className="mba-sub-meta">
                    <div>
                      <label>Marks</label>
                      <input
                        type="number"
                        value={sub.marks ?? ""}
                        onChange={(e) =>
                          onSubQuestionChange(
                            index,
                            subIndex,
                            "marks",
                            e.target.value === ""
                              ? ""
                              : Math.max(0, parseInt(e.target.value, 10))
                          )
                        }
                        disabled={isSubmitted}
                        min={0}
                        max={20}
                      />
                    </div>
                  </div>

                  {/* Sub-question image */}
                  <div className="mba-file-upload">
                    <label>Reference Image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        onSubQuestionChange(
                          index,
                          subIndex,
                          "image",
                          e.target.files[0] || null
                        )
                      }
                      disabled={isSubmitted}
                    />
                    {sub.image && (
                      <img
                        src={getImageSource(sub.image)}
                        alt={`Sub-question ${sub.label}`}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* ADD SUB-QUESTION BUTTON */}
                {!isSubmitted &&
                  question.subQuestions.length < SUB_LABELS.length &&
                  totalAllocated < 20 && (
                    <button
                      type="button"
                      className="mba-add-sub-btn"
                      onClick={() => onAddSubQuestion(index)}
                    >
                      ➕ Add sub-question
                      {nextSubLabel ? ` (${nextSubLabel})` : ""}
                    </button>
                  )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MBAQuestionPaperBuilder;
