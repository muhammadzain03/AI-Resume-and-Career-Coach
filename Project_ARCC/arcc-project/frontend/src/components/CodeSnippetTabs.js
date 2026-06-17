import React, { useState } from "react";

const LANGUAGES = ["TypeScript", "Python", "Bash"];

const SNIPPETS = {
  TypeScript: (
    <>
      <span className="home-code__kw">const</span> res ={" "}
      <span className="home-code__kw">await</span> fetch(
      <span className="home-code__str">
        &quot;http://localhost:5000/api/analysis/run&quot;
      </span>
      , {"{"}
      {"\n  "}
      method: <span className="home-code__str">&quot;POST&quot;</span>,{"\n  "}
      headers: {"{"}
      {"\n    "}
      <span className="home-code__str">&quot;Authorization&quot;</span>:{" "}
      <span className="home-code__str">`Bearer ${"{"}token{"}"}`</span>,{"\n    "}
      <span className="home-code__str">&quot;Content-Type&quot;</span>:{" "}
      <span className="home-code__str">&quot;application/json&quot;</span>,{"\n  "}
      {"}"},{"\n  "}
      body: JSON.stringify({"{"}
      {"\n    "}
      resume_id: <span className="home-code__num">42</span>,{"\n    "}
      job_description:{" "}
      <span className="home-code__str">
        &quot;Senior Frontend Engineer...&quot;
      </span>
      ,{"\n  "}
      {"}"}),{"\n"}
      );{"\n"}
      <span className="home-code__kw">const</span> data ={" "}
      <span className="home-code__kw">await</span> res.json();{"\n"}
      console.log(data.match_score);
    </>
  ),
  Python: (
    <>
      <span className="home-code__kw">import</span> requests{"\n\n"}
      resp = requests.post(
      {"\n    "}
      <span className="home-code__str">
        &quot;http://localhost:5000/api/analysis/run&quot;
      </span>
      ,{"\n    "}
      headers={"{"}
      <span className="home-code__str">&quot;Authorization&quot;</span>:{" "}
      <span className="home-code__str">f&quot;Bearer {"{"}token{"}"}&quot;</span>
      {"}"},{"\n    "}
      json={"{"}
      {"\n        "}
      <span className="home-code__str">&quot;resume_id&quot;</span>:{" "}
      <span className="home-code__num">42</span>,{"\n        "}
      <span className="home-code__str">&quot;job_description&quot;</span>:{" "}
      <span className="home-code__str">
        &quot;Senior Frontend Engineer...&quot;
      </span>
      ,{"\n    "}
      {"}"},{"\n"}
      ){"\n"}
      print(resp.json()[<span className="home-code__str">&quot;match_score&quot;</span>])
    </>
  ),
  Bash: (
    <>
      curl -X POST http://localhost:5000/api/analysis/run \{"\n  "}
      -H <span className="home-code__str">&quot;Authorization: Bearer $TOKEN&quot;</span> \
      {"\n  "}
      -H <span className="home-code__str">&quot;Content-Type: application/json&quot;</span> \
      {"\n  "}
      -d <span className="home-code__str">
        &apos;{"{"}&quot;resume_id&quot;: 42, &quot;job_description&quot;: &quot;Senior Frontend Engineer...&quot;{"}"}&apos;
      </span>
    </>
  ),
};

const CodeSnippetTabs = () => {
  const [lang, setLang] = useState("TypeScript");

  return (
    <div className="home-code">
      <div className="home-code__tabs" role="tablist" aria-label="Code examples">
        {LANGUAGES.map((label) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={lang === label}
            className={`home-code__tab${lang === label ? " is-active" : ""}`}
            onClick={() => setLang(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <pre className="home-code__body" role="tabpanel">
        <code>{SNIPPETS[lang]}</code>
      </pre>
    </div>
  );
};

export default CodeSnippetTabs;
