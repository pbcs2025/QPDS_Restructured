import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FaChartBar, FaArrowLeft } from "react-icons/fa";
import "./ViewAnalytics.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001/api";

const CustomLegend = () => {
  const items = [
    { key: 'sent', name: 'Papers Sent', color: '#3b82f6' },
    { key: 'received', name: 'Papers Received', color: '#22c55e' },
    { key: 'pending', name: 'Papers Pending', color: '#ef4444' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it) => (
        <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, backgroundColor: it.color, display: 'inline-block', borderRadius: 2 }} />
          <span style={{ color: it.color }}>{it.name}</span>
        </div>
      ))}
    </div>
  );
};

const ViewAnalytics = () => {
  const [dept, setDept] = useState("");
  const [sem, setSem] = useState("");
  const [subject, setSubject] = useState("");
  const [chartData, setChartData] = useState([]);
  const [showChart, setShowChart] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [metrics, setMetrics] = useState({ sent: 0, received: 0, pending: 0, rejected: 0 });
  const navigate = useNavigate();

  // Fetch backend data for departments and subjects
  useEffect(() => {
    const load = async () => {
      try {
        // Departments (active)
        const depRes = await axios.get(`${API_BASE}/departments/active`);
        const depNames = Array.isArray(depRes.data)
          ? depRes.data.map((d) => d.name)
          : [];
        setDepartments(depNames);

        // Subjects (all) -> used to derive semesters and subject codes
        const subRes = await axios.get(`${API_BASE}/subjects`);
        setAllSubjects(Array.isArray(subRes.data) ? subRes.data : []);
      } catch (err) {
        console.error("Error loading analytics metadata:", err);
        setDepartments([]);
        setAllSubjects([]);
      }
    };
    load();
  }, []);

  // Derive semester options for selected department
  const semesterOptions = React.useMemo(() => {
    if (!dept) return [];
    const set = new Set(
      allSubjects
        .filter((s) => s.department === dept)
        .map((s) => String(s.semester))
    );
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [dept, allSubjects]);

  // Derive subject code options for selected department + semester
  const subjectCodeOptions = React.useMemo(() => {
    if (!dept || !sem) return [];
    return allSubjects
      .filter((s) => s.department === dept && String(s.semester) === String(sem))
      .map((s) => s.subject_code)
      .sort();
  }, [dept, sem, allSubjects]);

  const handleConfirm = () => {
    if (!dept || !sem || !subject) {
      setError("⚠️ Please select all fields before confirming.");
      setShowChart(false);
      return;
    }
    setError("");

    const fetchAnalytics = async () => {
      try {
        // 1) Submitted and Pending from QuestionPaper (backend returns submitted or pending)
        let submittedRows = [];
        try {
          const submittedRes = await axios.get(`${API_BASE}/papers`, {
            params: { department: dept, semester: sem, subject_code: subject },
          });
          submittedRows = (submittedRes.data && submittedRes.data.papers) || [];
        } catch (err) {
          console.error('Failed to fetch submitted/pending papers', err?.response?.status, err?.message);
          submittedRows = [];
        }

        // Filter by subject_code and ensure dept/sem match as strings/numbers
        const filteredSubmitted = submittedRows.filter((p) => {
          const sc = p.subject_code;
          const dep = p.department;
          const se = String(p.semester);
          return (
            sc === subject && dep === dept && (se === String(sem) || p.semester === Number(sem))
          );
        });

        // Sent = number of QP setters selected (assignments for the subject, optionally filtered by department)
        let sentCount = 0;
        try {
          const assignmentsRes = await axios.get(`${API_BASE}/assignments/${encodeURIComponent(subject)}` , {
            params: { department: dept || undefined },
          });
          sentCount = Array.isArray(assignmentsRes.data) ? assignmentsRes.data.length : 0;
        } catch (err) {
          console.error('Failed to fetch assignments for subject', subject, err?.response?.status, err?.message);
          sentCount = 0; // fall back so analytics can still render
        }

        // 2) Approved from ApprovedPaper
        let receivedCount = 0;
        try {
          const approvedRes = await axios.get(`${API_BASE}/papers/approved`, {
            params: { department: dept, semester: sem, subject_code: subject },
          });
          const approvedRows = (approvedRes.data && approvedRes.data.papers) || [];
          receivedCount = approvedRows.length;
        } catch (err) {
          console.error('Failed to fetch approved papers for', subject, err?.response?.status, err?.message);
          receivedCount = 0;
        }
        const pendingCount = Math.max(sentCount - receivedCount, 0);

        // 3) Rejected from RejectedPaper
        let rejectedCount = 0;
        try {
          const rejectedRes = await axios.get(`${API_BASE}/papers/rejected`, {
            params: { department: dept, semester: sem, subject_code: subject },
          });
          const rejectedRows = (rejectedRes.data && rejectedRes.data.papers) || [];
          rejectedCount = rejectedRows.length;
        } catch (err) {
          console.error('Failed to fetch rejected papers for', subject, err?.response?.status, err?.message);
          rejectedCount = 0;
        }

        const dynamicData = [
          { name: "Papers Sent", sent: sentCount, received: 0, pending: 0 },
          { name: "Papers Received", sent: 0, received: receivedCount, pending: 0 },
          { name: "Papers Pending", sent: 0, received: 0, pending: pendingCount },
        ];

        setChartData(dynamicData);
        setMetrics({ sent: sentCount, received: receivedCount, pending: pendingCount, rejected: rejectedCount });
        setShowChart(true);
      } catch (e) {
        console.error('Failed to load analytics:', e);
        setError(`Failed to load analytics for subject ${subject}. Showing zeros.`);
        // Show a zeroed chart rather than hiding
        const zeroData = [
          { name: 'Papers Sent', sent: 0, received: 0, pending: 0 },
          { name: 'Papers Received', sent: 0, received: 0, pending: 0 },
          { name: 'Papers Pending', sent: 0, received: 0, pending: 0 },
        ];
        setChartData(zeroData);
        setMetrics({ sent: 0, received: 0, pending: 0, rejected: 0 });
        setShowChart(true);
      }
    };

    fetchAnalytics();
  };

  // Tooltip that shows only hovered bar value; when hovering 'Papers Pending', also show approved and rejected counts
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload.find((p) => Number(p.value) > 0);
    if (!item) return null;
    const isPendingCategory = label === 'Papers Pending';
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 10, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {isPendingCategory ? (
          <div>
            <div style={{ color: '#ef4444' }}>Papers Pending: {metrics.pending}</div>
            <div style={{ color: '#22c55e' }}>Approved Papers: {metrics.received}</div>
            <div style={{ color: '#dc2626' }}>Rejected Papers: {metrics.rejected}</div>
          </div>
        ) : (
          <div style={{ color: item.fill }}>{item.name}: {item.value}</div>
        )}
      </div>
    );
  };

  return (
    <div className="view-analytics-container">
      <div className="view-analytics-header">
        <FaChartBar className="view-analytics-icon" />
        <h2>View Analytics</h2>
      </div>

      <div className="view-analytics-form-row">
        <div className="view-analytics-field">
          <label className="view-analytics-label">Department *</label>
          <select
            className="view-analytics-select"
            value={dept}
            onChange={(e) => {
              setSubject("");
              setSem("");
              setDept(e.target.value);
              setShowChart(false);
              setChartData([]);
            }}
          >
            <option value="">Select Department</option>
            {departments.map((d, i) => (
              <option key={i} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="view-analytics-field">
          <label className="view-analytics-label">Semester *</label>
          <select
            className="view-analytics-select"
            value={sem}
            onChange={(e) => {
              setSubject("");
              setSem(e.target.value);
              setShowChart(false);
              setChartData([]);
            }}
          >
            <option value="">Select Semester</option>
            {semesterOptions.map((s, i) => (
              <option key={i} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="view-analytics-field">
          <label className="view-analytics-label">Subject Code *</label>
          <select
            className="view-analytics-select"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value.trim());
              setShowChart(false);
              setChartData([]);
            }}
          >
            <option value="">Select Subject</option>
            {subjectCodeOptions.map((code, i) => (
              <option key={i} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <button className="view-analytics-button" onClick={handleConfirm}>
          Confirm
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showChart && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 140, left: 10, bottom: 10 }}
              barCategoryGap={60}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} tickMargin={8} />
              <YAxis domain={[0, 'dataMax + 2']} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ paddingLeft: 16 }} content={<CustomLegend />} />
              <Bar dataKey="sent" fill="#3b82f6" name="Papers Sent" stackId="grp" barSize={40} />
              <Bar dataKey="received" fill="#22c55e" name="Papers Received" stackId="grp" barSize={40} />
              <Bar
                dataKey="pending"
                fill="#ef4444"
                name="Papers Pending"
                stackId="grp"
                barSize={40}
                onClick={(_, index) => {
                  const row = chartData[index];
                  if (!row || row.name !== 'Papers Pending') return;
                  if (!subject) return;
                  const params = new URLSearchParams();
                  params.set('tab', 'viewAssignees');
                  params.set('subject', subject);
                  if (dept) params.set('department', dept);
                  if (sem) params.set('semester', String(sem));
                  navigate(`/super-admin-dashboard?${params.toString()}`);
                }}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ViewAnalytics;
