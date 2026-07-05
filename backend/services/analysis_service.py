"""
Deterministic resume -> job overlap (hybrid baseline for Phase 2).
Used as fallback when the LLM fails and to seed matched / missing token lists.
"""

import re

# ---------------------------------------------------------------------------
# Expanded stopwords: common English words that are NOT technical skills.
# ---------------------------------------------------------------------------
_STOP = {
    # determiners / pronouns / prepositions / conjunctions
    "a", "an", "the", "and", "or", "but", "nor", "for", "yet", "so",
    "to", "of", "in", "on", "at", "by", "as", "if", "is", "it",
    "be", "am", "are", "was", "were", "been", "being",
    "do", "does", "did", "done", "doing",
    "have", "has", "had", "having",
    "will", "would", "shall", "should", "can", "could", "may", "might", "must",
    "not", "no", "yes",
    "he", "she", "we", "us", "me", "my", "our", "your", "you", "they", "them",
    "their", "its", "his", "her", "who", "whom", "whose", "which", "that",
    "this", "these", "those", "what", "where", "when", "how", "why",
    "i", "also", "just", "very", "too", "even", "only", "then", "than",
    "from", "with", "into", "onto", "upon", "about", "above", "below",
    "between", "through", "during", "before", "after", "since", "until",
    "while", "within", "without", "against", "along", "among", "around",

    # common job-posting filler
    "job", "role", "work", "working", "team", "teams", "company", "position",
    "years", "year", "month", "months", "day", "days", "time", "full-time",
    "part-time", "contract", "remote", "hybrid", "onsite", "on-site",
    "looking", "seeking", "hiring", "join", "apply", "candidate", "candidates",
    "qualified", "ideal", "preferred", "required", "requirements", "requirement",
    "responsibilities", "responsibility", "duties", "duty",
    "opportunity", "opportunities", "offer", "offers", "offering",
    "benefits", "benefit", "salary", "compensation", "bonus",
    "description", "title", "overview", "summary", "about",

    # common resume / career words (not skills)
    "experience", "experienced", "experiences",
    "education", "educational",
    "skills", "skill", "skilled",
    "knowledge", "knowledgeable",
    "ability", "abilities", "able",
    "strong", "excellent", "good", "great", "outstanding", "exceptional",
    "proficient", "proficiency",
    "understanding", "understand", "understands",
    "familiar", "familiarity",
    "proven", "demonstrated", "demonstrating",
    "successful", "successfully",
    "effective", "effectively",
    "professional", "professionals",
    "career", "careers",
    "projects", "project",
    "practices", "practice", "best",
    "results", "result",
    "solutions", "solution",
    "problems", "problem",
    "processes", "process",
    "systems", "system",
    "services", "service",
    "development", "developing", "develop", "developed", "develops",
    "management", "managing", "manage", "managed", "manager", "managers",
    "design", "designing", "designed",
    "implementation", "implementing", "implement", "implemented",
    "building", "build", "built",
    "create", "creating", "created", "creation",
    "support", "supporting", "supported",
    "maintain", "maintaining", "maintained", "maintenance",
    "testing", "test", "tested",
    "ensure", "ensuring", "ensured",
    "provide", "providing", "provided",
    "include", "including", "includes", "included",
    "related", "relevant", "applicable",
    "use", "using", "used", "utilize", "utilizing", "utilized",
    "well", "etc", "e.g", "i.e",

    # common English verbs / adjectives that aren't skills
    "new", "current", "other", "more", "most", "some", "any", "all", "each",
    "every", "many", "much", "several", "few", "both", "own", "same",
    "different", "various", "multiple", "specific",
    "across", "per", "based", "level", "levels",
    "high", "low", "top", "large", "small",
    "first", "last", "next", "end",
    "part", "full", "key", "core", "major", "minor",
    "real", "real-world", "world",
    "need", "needs", "needed",
    "want", "help", "helps", "helping",
    "take", "give", "make", "set", "get", "go", "come", "see", "know",
    "like", "way", "ways",
    "plus", "minimum", "maximum", "least", "additional",

    # calendar / misc
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
    "present", "date",

    # generic nouns that leak into "skills"
    "information", "data", "technology", "technologies",
    "application", "applications",
    "environment", "environments",
    "performance", "quality", "standard", "standards",
    "communication", "communications", "collaboration", "collaborative",
    "leadership", "leader", "leaders",
    "customer", "customers", "client", "clients", "stakeholder", "stakeholders",
    "business", "industry", "organization", "organizations",
    "strategy", "strategies", "strategic",
    "operations", "operational",
    "analysis", "analytical", "analyze", "analyzing",
    "report", "reports", "reporting",
    "documentation", "document", "documents",
    "training", "train", "trained",
    "learning", "learn", "learned",
    "growth", "scale", "scaling",
    "product", "products",
    "market", "marketing",
    "plan", "planning", "planned",
    "program", "programs", "programming",
    "engineering", "engineer", "engineers",
    "software", "hardware",
    "tools", "tool",
    "platform", "platforms",
    "framework", "frameworks",
    "component", "components",
    "feature", "features",
    "code", "coding",
    "review", "reviews",
    "integration", "integrating", "integrated",
    "deployment", "deploying", "deployed",
    "deliver", "delivery", "delivering", "delivered",
    "drive", "driving", "driven",
    "improve", "improving", "improved", "improvement", "improvements",
    "research", "researching",
    "profile", "profiles",
    "technical", "non-technical",
    "cross-functional",
    "written", "verbal", "oral",
    "initiative", "initiatives",
    "attention", "detail", "details",
    "deadline", "deadlines",
    "fast-paced", "dynamic",
}

# ---------------------------------------------------------------------------
# Known technical terms: short acronyms (<=2 chars) that ARE valid skills.
# Tokens matching these bypass the length filter.
# ---------------------------------------------------------------------------
_TECH_ALLOWLIST = {
    # Programming languages
    "c", "r", "go",
    # AI / ML / Data
    "ai", "ml", "dl", "nlp", "cv", "bi", "etl", "kpi",
    # Software / Web / Systems
    "ui", "ux", "api", "sdk", "cli", "orm", "mvc", "ci", "cd", "db", "os", "vm", "io",
    # Networking / Security
    "it", "vpn", "dns", "tcp", "ssl", "tls", "iam", "sso", "mfa",
    # Cloud / Infrastructure
    "aws", "gcp",
    # Quality / Testing
    "qa", "qc", "tdd", "bdd",
    # Project / Process
    "pm", "po", "ba", "erp", "crm", "hr", "sla", "okr", "roi",
    # Finance
    "p&l", "m&a", "ar", "ap", "fx", "ipo", "npv", "irr", "esg",
    # Healthcare
    "ehr", "emr", "icu", "er", "rn", "md", "np", "irb", "fda", "ppe", "iv",
    # Engineering / Manufacturing
    "cad", "cam", "plc", "cnc", "bom", "iso", "sop",
    # Legal / Compliance
    "gdpr", "hipaa", "kyc", "aml", "ip",
    # Education
    "k12", "ell", "iep", "lms", "stem",
    # Marketing
    "seo", "sem", "ctr", "cpm", "cpa", "b2b", "b2c", "saas", "cro",
}

# ---------------------------------------------------------------------------
# Recognized technical terms (multi-char). When a token matches one of these
# it is guaranteed to be kept even if it looks like an ordinary word.
# ---------------------------------------------------------------------------
_TECHNICAL_TERMS = {
    # Languages
    "python", "java", "javascript", "typescript", "kotlin", "swift", "rust",
    "scala", "ruby", "php", "perl", "matlab", "haskell", "elixir", "dart",
    "lua", "fortran", "cobol", "assembly", "bash", "powershell", "groovy",
    "c++", "c#", "f#", "objective-c", "vb.net",
    # Web / Frontend
    "react", "angular", "vue", "svelte", "nextjs", "next.js", "nuxt",
    "gatsby", "webpack", "vite", "tailwind", "tailwindcss", "bootstrap",
    "html", "html5", "css", "css3", "sass", "scss", "less",
    "jquery", "redux", "mobx", "zustand", "graphql", "rest", "restful",
    # Backend / Server
    "node", "nodejs", "node.js", "express", "fastify", "nestjs", "django",
    "flask", "fastapi", "spring", "springboot", "spring-boot",
    "rails", "laravel", "sinatra", "gin", "echo", "fiber",
    "asp.net", ".net", "dotnet",
    # Databases
    "sql", "mysql", "postgresql", "postgres", "sqlite", "mongodb", "mongo",
    "redis", "cassandra", "dynamodb", "couchdb", "neo4j", "elasticsearch",
    "mariadb", "oracle", "mssql",
    # Cloud / DevOps / Infra
    "azure", "heroku", "vercel", "netlify", "digitalocean",
    "docker", "kubernetes", "k8s", "terraform", "ansible", "puppet", "chef",
    "jenkins", "circleci", "travisci", "github-actions", "gitlab-ci",
    "nginx", "apache", "linux", "unix", "ubuntu", "centos", "debian",
    "prometheus", "grafana", "datadog", "splunk", "elk",
    "cloudformation", "pulumi", "vagrant", "helm", "istio",
    "lambda", "s3", "ec2", "rds", "ecs", "eks", "fargate", "sqs", "sns",
    "cloudfront", "route53", "iam",
    # Data / ML / AI
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
    "scikit-learn", "sklearn", "tensorflow", "pytorch", "keras",
    "huggingface", "opencv", "spacy", "nltk",
    "spark", "hadoop", "hive", "kafka", "airflow", "dbt", "snowflake",
    "bigquery", "redshift", "databricks", "tableau", "powerbi", "looker",
    "jupyter", "colab",
    # Mobile
    "react-native", "flutter", "ionic", "xamarin", "swiftui", "jetpack",
    "android", "ios",
    # Testing
    "jest", "mocha", "chai", "cypress", "selenium", "playwright",
    "pytest", "unittest", "rspec", "junit", "testng",
    # Version control / Tools
    "git", "github", "gitlab", "bitbucket", "svn", "mercurial",
    "jira", "confluence", "trello", "asana", "notion", "slack",
    "figma", "sketch", "invision", "zeplin", "adobe-xd",
    # Protocols / Formats
    "http", "https", "websocket", "grpc", "protobuf", "json", "xml",
    "yaml", "csv", "avro", "parquet",
    # Security
    "oauth", "jwt", "saml", "ldap", "kerberos", "cors",
    # Methodologies
    "agile", "scrum", "kanban", "devops", "cicd", "ci/cd",
    "microservices", "monolith", "serverless", "event-driven",
    "oop", "functional", "mvc", "mvvm",
}


# ---------------------------------------------------------------------------
# Variant canonicalization. Different spellings of the same skill should match.
# Aliases map single tokens; bigrams collapse two-word skills into one token
# before tokenization so phrases like "machine learning" are matched.
# ---------------------------------------------------------------------------
_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "postgres": "postgresql",
    "node": "nodejs",
    "node.js": "nodejs",
    "next.js": "nextjs",
    "k8s": "kubernetes",
    "gcp": "google-cloud",
    "ml": "machine-learning",
    "ai": "artificial-intelligence",
    "tf": "tensorflow",
    "sklearn": "scikit-learn",
    "py": "python",
}

_BIGRAMS = {
    "machine learning": "machine-learning",
    "deep learning": "deep-learning",
    "react native": "react-native",
    "power bi": "powerbi",
    "artificial intelligence": "artificial-intelligence",
    "natural language processing": "nlp",
    "computer vision": "computer-vision",
    "data science": "data-science",
    "google cloud": "google-cloud",
    "spring boot": "springboot",
    "ci/cd": "cicd",
}


def _normalize_text(text: str) -> str:
    """Lowercase and collapse known two-word skills into single tokens."""
    if not text:
        return ""
    lowered = text.lower()
    for phrase, canonical in _BIGRAMS.items():
        lowered = lowered.replace(phrase, canonical)
    return lowered


def _tokenize(text: str) -> set:
    """Extract lowercase tokens, keeping tech-friendly characters.

    Trailing sentence punctuation is stripped so 'node.' and 'postgres.' match
    'node'/'postgres', while meaningful forms like '.net', 'c++', and 'ci/cd'
    are preserved (only trailing . , ; : are removed)."""
    if not text:
        return set()
    raw = re.findall(r"[a-z][a-z0-9+#./\-&]*", _normalize_text(text))
    return {t.rstrip(".,;:") for t in raw if t.rstrip(".,;:")}


def _extract_technical_tokens(tokens: set) -> set:
    """
    From raw tokens, keep only those that look like real technical skills:
    1. Canonicalize known variants via the alias map
    2. In the explicit tech allowlist or known terms dict  -> always keep
    3. Not in the expanded stopword list                   -> keep if len > 2
    """
    kept = set()
    for raw in tokens:
        t = _ALIASES.get(raw, raw)
        if t in _TECH_ALLOWLIST or t in _TECHNICAL_TERMS:
            kept.add(t)
        elif t not in _STOP and len(t) > 2:
            kept.add(t)
    return kept


def analyze_resume_against_job(resume_text: str, job_description: str) -> dict:
    """
    Deterministic keyword overlap between resume and job description.
    Only considers technical / domain-specific tokens.
    """
    raw_resume = _tokenize(resume_text)
    raw_jd = _tokenize(job_description)

    r = _extract_technical_tokens(raw_resume)
    j = _extract_technical_tokens(raw_jd)

    if not j:
        return {
            "match_score": 0.0,
            "matched_skills": [],
            "missing_skills": [],
        }

    matched = sorted(r & j)
    missing = sorted(j - r)
    score = round((len(matched) / max(len(j), 1)) * 100, 2)

    return {
        "match_score": float(score),
        "matched_skills": matched[:80],
        "missing_skills": missing[:80],
    }
