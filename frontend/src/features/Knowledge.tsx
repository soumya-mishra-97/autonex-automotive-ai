import { BookOpen, FileText } from "lucide-react";
import { useShowroom } from "../app/composition";

export function Knowledge() {
  const documents = useShowroom((state) => state.documents);
  return (
    <section className="knowledge">
      <span className="eyebrow">
        <BookOpen size={14} /> THE DETAILS THAT MATTER
      </span>
      <h2>
        A little knowledge.
        <br />
        <em>A more confident choice.</em>
      </h2>
      <p>
        Public BMW reference notes and clearly separated AUTONEX demonstration fixtures. Check the
        model year and region before using reference information.
      </p>
      <div className="knowledge-documents">
        {documents.map((doc) => (
          <details key={doc.id}>
            <summary>
              <FileText size={19} />
              <span>
                {doc.title}
                <small>{doc.vehicle_id ? "Vehicle guide" : "Ownership guide"}</small>
              </span>
              <span className="document-open">Read guide +</span>
            </summary>
            <div className="document-content">
              <p className="document-version">
                Version: {doc.version}{" "}
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    VIEW PUBLISHED BMW SOURCE ↗
                  </a>
                )}
              </p>
              {doc.content
                .split("\n\n")
                .filter((block) => !block.startsWith("# "))
                .map((block, index) => {
                  const [heading, ...body] = block.split("\n");
                  return heading?.startsWith("## ") ? (
                    <section key={index}>
                      <h3>{heading.replace(/^## /, "")}</h3>
                      <p>{body.join(" ")}</p>
                    </section>
                  ) : (
                    <p key={index}>{block}</p>
                  );
                })}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
