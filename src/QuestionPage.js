import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

function QuestionPage() {
  const location = useLocation();
  const initialPdfUrl = location.state?.pdfUrl || null;

  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [retrievedPages, setRetrievedPages] = useState([]);
  const [fileUrl, setFileUrl] = useState(initialPdfUrl);
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [jumpPage, setJumpPage] = useState("");

  const leftPaneRef = useRef(null);
  const pageRefs = useRef({});

  useEffect(() => {
    const updateWidth = () => {
      if (leftPaneRef.current) setPageWidth(leftPaneRef.current.offsetWidth);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleJumpToPage = () => {
    const pageNumber = parseInt(jumpPage, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= numPages) {
      pageRefs.current[pageNumber]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSubmit = async () => {
    if (!question) return;
    try {
      const res = await fetch("http://127.0.0.1:5000/ask-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setResponse(data.response);
      setRetrievedPages(data.retrieved_pages || []);

      if (data.retrieved_pages && data.retrieved_pages.length > 0) {
        const firstPage = data.retrieved_pages[0];
        setTimeout(() => {
          pageRefs.current[firstPage]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    } catch (err) {
      console.error("Error sending question:", err);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Left column */}
      <div
        ref={leftPaneRef}
        style={{
          width: "50%",
          height: "100vh",
          overflowY: "auto",
          background: "#070712",
          color: "#a0d2eb",
          borderRight: "1px solid #333",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Sticky jump input */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#070712",
            color: "#a0d2eb",
            padding: "10px",
            textAlign: "center",
            borderBottom: "1px solid #333",
            flexShrink: 0,
          }}
        >
          <input
            type="number"
            min={1}
            max={numPages || 1}
            placeholder="Go to page..."
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJumpToPage()}
            style={{
              width: "120px",
              padding: "5px",
              fontSize: "14px",
              background: "#070712",
              color: "#a0d2eb",
              border: "1px solid #555",
            }}
          />
          <button
            onClick={handleJumpToPage}
            style={{
              marginLeft: "5px",
              padding: "5px 10px",
              background: "#070712",
              color: "#a0d2eb",
              border: "1px solid #555",
              cursor: "pointer",
            }}
          >
            Go
          </button>
        </div>

        {/* PDF pages container (flex-grow to fill left column) */}
        <div style={{ flexGrow: 1, background: "#070712" }}>
          {fileUrl && (
            <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
              {Array.from(new Array(numPages), (_, index) => {
                const pageNumber = index + 1;
                return (
                  <div
                    key={pageNumber}
                    ref={(el) => (pageRefs.current[pageNumber] = el)}
                    style={{ margin: 0, padding: 0, background: "#070712" }}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={pageWidth}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  </div>
                );
              })}
            </Document>
          )}
        </div>
      </div>

      {/* Right column */}
      <div
        style={{
          width: "50%",
          padding: "30px",
          height: "100vh",
          overflowY: "auto",
          background: "#070712",
          color: "#a0d2eb",
        }}
      >
        <h2>Ask a Question</h2>
        <input
          type="text"
          placeholder="Type your question here"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: "100%", padding: "10px", fontSize: "16px" }}
        />
        <br />
        <button
          onClick={handleSubmit}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            width: "100%",
            cursor: "pointer",
          }}
        >
          Submit
        </button>

        {response && (
          <div style={{ marginTop: "20px" }}>
            <h3>Relevant Pages:</h3>
            <p>{retrievedPages.join(", ")}</p>
            <h3>Answer:</h3>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.4" }}>{response}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionPage;
