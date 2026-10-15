
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

function App() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("");
  const [authMode, setAuthMode] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [uploadSemester, setUploadSemester] = useState("3");
  const [file, setFile] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("token") || ""
  );

  async function fetchNotes() {
    try {
      const response = await fetch(`${API}/notes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Could not load notes");
      }

      setNotes(data.notes || []);
    } catch (error) {
      setMessage("Could not load notes. Check your backend.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  async function handleAuth(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    const endpoint =
      authMode === "register" ? "register" : "login";

    const userData =
      authMode === "register"
        ? { name, email, password }
        : { email, password };

    try {
      const response = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      if (authMode === "register") {
        setAuthMode("login");
        setPassword("");
        setMessage("Registration successful. Please log in.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setToken(data.token);
      setCurrentUser(data.user);
      setAuthMode("");
      setName("");
      setEmail("");
      setPassword("");
      setMessage("");
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setCurrentUser(null);
    setMessage("");
  }

  async function handleUpload(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (!token) {
      setAuthMode("login");
      setMessage("Please log in before uploading notes.");
      return;
    }

    if (!file) {
      setMessage("Please select a PDF file.");
      setIsError(true);
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("subject", subject);
    formData.append("semester", uploadSemester);
    formData.append("file", file);

    try {
      const response = await fetch(`${API}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setMessage("Note uploaded successfully!");
      setTitle("");
      setDescription("");
      setSubject("");
      setUploadSemester("3");
      setFile(null);
      setShowUpload(false);

      await fetchNotes();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  }

  async function deleteNote(id) {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/notes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed");
      }

      setMessage("Note deleted successfully.");
      setNotes((oldNotes) => oldNotes.filter((note) => note._id !== id));
      setIsError(false);
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  }

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.subject.toLowerCase().includes(search.toLowerCase());

    const matchesSemester =
      semester === "" || String(note.semester) === semester;

    return matchesSearch && matchesSemester;
  });

  return (
    <div className="app">
      <nav className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">N</span>
          <span>
            <strong>NoteNest</strong>
            <small>Share · Learn · Grow</small>
          </span>
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#notes">Notes</a>
          <a
            href="#upload"
            onClick={() => {
              if (token) setShowUpload(true);
              else setAuthMode("login");
            }}
          >
            Upload
          </a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          {currentUser ? (
            <>
              <span className="welcome-user">
                Hi, {currentUser.name}
              </span>
              <button className="outline-btn" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="outline-btn"
                onClick={() => {
                  setAuthMode("login");
                  setMessage("");
                }}
              >
                Login
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  setAuthMode("register");
                  setMessage("");
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      <main>
        {authMode && (
          <section className="auth-section">
            <form className="auth-card" onSubmit={handleAuth}>
              <span className="section-label">WELCOME TO NOTENEST</span>
              <h2>
                {authMode === "register"
                  ? "Create your account"
                  : "Welcome back"}
              </h2>
              <p className="auth-description">
                {authMode === "register"
                  ? "Join other students and share your notes."
                  : "Log in to continue your learning journey."}
              </p>

              {authMode === "register" && (
                <label>
                  Full name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </label>
              )}

              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  placeholder="At least 6 characters"
                  required
                />
              </label>

              {message && (
                <p className={isError ? "auth-error" : "auth-success"}>
                  {message}
                </p>
              )}

              <button className="primary-btn auth-submit" type="submit">
                {authMode === "register" ? "Create Account" : "Login"}
              </button>

              <p className="auth-switch">
                {authMode === "register"
                  ? "Already registered?"
                  : "New to NoteNest?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(
                      authMode === "register" ? "login" : "register"
                    );
                    setMessage("");
                  }}
                >
                  {authMode === "register" ? "Login" : "Sign Up"}
                </button>
              </p>

              <button
                type="button"
                className="close-auth"
                onClick={() => setAuthMode("")}
              >
                Close
              </button>
            </form>
          </section>
        )}

        {showUpload && (
          <section className="auth-section" id="upload">
            <form className="auth-card" onSubmit={handleUpload}>
              <span className="section-label">SHARE YOUR KNOWLEDGE</span>
              <h2>Upload notes</h2>
              <p className="auth-description">
                Select a PDF and enter its details.
              </p>

              <label>
                Note title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DBMS Unit 1"
                  required
                />
              </label>

              <label>
                Subject
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. DBMS"
                  required
                />
              </label>

              <label>
                Description
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                />
              </label>

              <label>
                Semester
                <select
                  value={uploadSemester}
                  onChange={(e) => setUploadSemester(e.target.value)}
                  required
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      Semester {n}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                PDF file
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  required
                />
              </label>

              <button className="primary-btn auth-submit" type="submit">
                Upload PDF
              </button>

              <button
                type="button"
                className="close-auth"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </button>
            </form>
          </section>
        )}

        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">
              ✦ MADE FOR STUDENTS, BY STUDENTS
            </span>
            <h1>
              Find. Share. Learn.
              <br />
              All in <span>one place.</span>
            </h1>
            <p>
              Find useful study notes, prepare for exams,
              and share your knowledge with classmates.
            </p>

            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes by subject..."
              />
              <button
                className="primary-btn"
                onClick={() => {
                  document
                    .getElementById("notes")
                    .scrollIntoView({ behavior: "smooth" });
                }}
              >
                Search
              </button>
            </div>

            <div className="subject-tags">
              {[
                "DBMS",
                "Operating System",
                "Computer Networks",
                "Data Structures",
              ].map((s) => (
                <button key={s} onClick={() => setSearch(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-art">
            <div className="art-circle"></div>
            <div className="floating-note">
              PDF
              <br />
              NOTES
            </div>
            <div className="book-stack">
              <div className="book book-one">DBMS</div>
              <div className="book book-two">Operating System</div>
              <div className="book book-three">Computer Networks</div>
            </div>
            <div className="study-card">
              <span>✦</span>
              <h3>Study smart.</h3>
              <p>Share what you learn.</p>
            </div>
            <div className="hero-emoji">📚</div>
          </div>
        </section>

        <section className="features" id="about">
          <div className="feature">
            <span className="feature-icon blue-bg">▤</span>
            <div>
              <h3>Study Materials</h3>
              <p>Notes for different subjects</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon orange-bg">♧</span>
            <div>
              <h3>Student Community</h3>
              <p>Share knowledge together</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon green-bg">↓</span>
            <div>
              <h3>Easy Downloads</h3>
              <p>Get notes in PDF format</p>
            </div>
          </div>
        </section>

        {currentUser && (
          <section className="dashboard-stats">
            <div className="section-heading">
              <div>
                <span className="section-label">YOUR DASHBOARD</span>
                <h2>Welcome, {currentUser.name}!</h2>
                <p>Here is your NoteNest activity.</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span>📚</span>
                <h3>{notes.length}</h3>
                <p>Total Notes</p>
              </div>

              <div className="stat-card">
                <span>📤</span>
                <h3>
                  {notes.filter((note) => {
                    const uploaderId =
                      note.uploadedBy?._id || note.uploadedBy;
                    return String(uploaderId) === String(currentUser.id);
                  }).length}
                </h3>
                <p>My Uploads</p>
              </div>

              <div className="stat-card">
                <span>🎓</span>
                <h3>Student</h3>
                <p>Account Type</p>
              </div>
            </div>
          </section>
        )}

        <section className="notes-section" id="notes">
          <div className="section-heading">
            <div>
              <span className="section-label">STUDY RESOURCES</span>
              <h2>Explore latest notes</h2>
              <p>Useful materials shared by fellow students.</p>
            </div>

            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="">All semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            </select>
          </div>

          {message && !authMode && !showUpload && (
            <p className={isError ? "auth-error" : "auth-success"}>
              {message}
            </p>
          )}

          {loading && (
            <p className="status-message">Loading notes...</p>
          )}

          {!loading && filteredNotes.length === 0 && (
            <div className="empty-state">
              <h3>No notes found</h3>
              <p>Try another search or upload the first note.</p>
            </div>
          )}

          <div className="note-grid">
            {filteredNotes.map((note, index) => {
              const colors = ["blue", "orange", "green", "purple"];
              const uploaderId =
                note.uploadedBy?._id || note.uploadedBy;
              const isOwner =
                currentUser &&
                String(uploaderId) === String(currentUser.id);

              return (
                <article className="note-card" key={note._id}>
                  <div className={`note-icon ${colors[index % 4]}`}>
                    PDF
                  </div>
                  <span className={`subject-label ${colors[index % 4]}`}>
                    {note.subject}
                  </span>
                  <h3>{note.title}</h3>
                  <p>Semester {note.semester}</p>

                  <div className="note-footer">
                    <span>
                      ♙ {note.uploadedBy?.name || "Student"}
                    </span>
                    <button
                      className="download-btn"
                      onClick={() =>
                        window.open(
                          `${API}/notes/${note._id}/download`,
                          "_blank"
                        )
                      }
                    >
                      ↓ Download
                    </button>
                    {isOwner && (
                      <button
                        className="download-btn"
                        onClick={() => deleteNote(note._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="upload-banner">
          <div className="upload-illustration">📂</div>
          <div className="upload-text">
            <span className="section-label">HAVE NOTES TO SHARE?</span>
            <h2>Help a friend learn better.</h2>
            <p>
              Upload your study materials and help your classmates.
            </p>
          </div>
          <button
            className="primary-btn"
            onClick={() => {
              setMessage("");
              if (token) setShowUpload(true);
              else setAuthMode("login");
            }}
          >
            ↑ Upload Notes
          </button>
        </section>
      </main>

      <footer>
        <strong>NoteNest</strong>
        <p>Made for students, by students. © 2026 NoteNest</p>
      </footer>
    </div>
  );
}

export default App;
