"""
ui.py — Gradio Blocks frontend for the Graphology AI Agent.

Provides a clean, elegant interface for uploading a handwriting image and
receiving a personality analysis report via the FastAPI backend.

Run with:
  python -m graphology.ui
or directly:
  python ui.py
"""

import requests
import gradio as gr


# ---------------------------------------------------------------------------
# API configuration
# ---------------------------------------------------------------------------

API_URL = "http://localhost:8000/analyze"


# ---------------------------------------------------------------------------
# Analysis handler
# ---------------------------------------------------------------------------

def analyze_handwriting(image_path: str | None) -> tuple[str, str]:
    """
    Read the uploaded image file, POST it to the FastAPI /analyze endpoint,
    and return (personality_traits, disclaimer) for display in the UI.

    Args:
        image_path: Local filepath of the uploaded image provided by Gradio.

    Returns:
        Tuple of (personality_traits_text, disclaimer_text).
    """
    if not image_path:
        return "Please upload a handwriting image before analyzing.", ""

    try:
        with open(image_path, "rb") as image_file:
            response = requests.post(
                API_URL,
                files={"file": ("handwriting.jpg", image_file, "image/jpeg")},
                timeout=600,
            )
        response.raise_for_status()
        data = response.json()

        personality_traits = data.get(
            "personality_traits",
            "No personality analysis was returned. Please try again.",
        )
        disclaimer = data.get(
            "disclaimer",
            "Graphology is not scientifically validated. "
            "This report is for reflective and entertainment purposes only.",
        )
        return personality_traits, disclaimer

    except Exception as e:
         return f"Analysis failed: {str(e)}", "",


# ---------------------------------------------------------------------------
# Custom CSS — refined editorial aesthetic
# ---------------------------------------------------------------------------

CUSTOM_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&display=swap');

:root {
    --ink:        #1a1410;
    --sepia-dark: #3d2b1f;
    --sepia-mid:  #7a5c45;
    --sepia-pale: #c9a882;
    --parchment:  #f5efe6;
    --cream:      #faf7f2;
    --rule:       rgba(122, 92, 69, 0.18);
    --accent:     #8b4513;
    --accent-hover: #6b3410;
    --shadow-warm: rgba(61, 43, 31, 0.12);
}

/* ---- Page base ---- */
.gradio-container {
    background: var(--cream) !important;
    font-family: 'Source Serif 4', Georgia, serif !important;
    color: var(--ink) !important;
}

/* Subtle ruled-paper texture */
.gradio-container::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: repeating-linear-gradient(
        transparent,
        transparent 27px,
        var(--rule) 27px,
        var(--rule) 28px
    );
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
}

/* ---- Header ---- */
.app-header {
    text-align: center;
    padding: 2.8rem 1rem 1.6rem;
    position: relative;
}

.app-header::after {
    content: '';
    display: block;
    width: 80px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--sepia-pale), transparent);
    margin: 1.2rem auto 0;
}

.app-title {
    font-family: 'Playfair Display', 'Times New Roman', serif !important;
    font-size: 2.6rem !important;
    font-weight: 600 !important;
    color: var(--sepia-dark) !important;
    letter-spacing: -0.01em !important;
    line-height: 1.15 !important;
    margin-bottom: 0.5rem !important;
}

.app-subtitle {
    font-family: 'Source Serif 4', Georgia, serif !important;
    font-size: 1rem !important;
    font-weight: 300 !important;
    font-style: italic !important;
    color: var(--sepia-mid) !important;
    max-width: 520px !important;
    margin: 0 auto !important;
    line-height: 1.65 !important;
}

/* ---- Cards / panels ---- */
.panel-card {
    background: var(--parchment) !important;
    border: 1px solid var(--rule) !important;
    border-radius: 4px !important;
    padding: 1.5rem 1.75rem !important;
    box-shadow: 0 2px 12px var(--shadow-warm) !important;
    position: relative;
}

/* Left ink-stroke accent */
.panel-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 18px;
    bottom: 18px;
    width: 3px;
    background: linear-gradient(180deg, var(--accent), var(--sepia-pale));
    border-radius: 0 2px 2px 0;
}

/* ---- Upload component ---- */
.upload-zone {
    border: 2px dashed var(--sepia-pale) !important;
    border-radius: 4px !important;
    background: rgba(250, 247, 242, 0.6) !important;
    transition: border-color 0.2s, background 0.2s;
}

.upload-zone:hover {
    border-color: var(--accent) !important;
    background: rgba(139, 69, 19, 0.04) !important;
}

/* ---- Analyze button ---- */
.analyze-btn {
    font-family: 'Playfair Display', serif !important;
    font-size: 1rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.04em !important;
    background: var(--accent) !important;
    color: #faf7f2 !important;
    border: none !important;
    border-radius: 3px !important;
    padding: 0.7rem 2rem !important;
    cursor: pointer !important;
    transition: background 0.2s, transform 0.1s, box-shadow 0.2s !important;
    box-shadow: 0 3px 10px rgba(139, 69, 19, 0.25) !important;
    width: 100% !important;
}

.analyze-btn:hover:not(:disabled) {
    background: var(--accent-hover) !important;
    box-shadow: 0 5px 16px rgba(139, 69, 19, 0.35) !important;
    transform: translateY(-1px) !important;
}

.analyze-btn:active {
    transform: translateY(0) !important;
}

.analyze-btn:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
}

/* ---- Textbox outputs ---- */
textarea {
    font-family: 'Source Serif 4', Georgia, serif !important;
    font-size: 0.95rem !important;
    font-weight: 300 !important;
    line-height: 1.75 !important;
    color: var(--ink) !important;
    background: rgba(250, 247, 242, 0.5) !important;
    border-color: var(--rule) !important;
    border-radius: 3px !important;
    padding: 0.9rem 1rem !important;
}

/* ---- Labels ---- */
label span, .gr-label {
    font-family: 'Playfair Display', serif !important;
    font-size: 0.82rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    color: var(--sepia-mid) !important;
}

/* ---- Footer ---- */
.app-footer {
    text-align: center;
    padding: 1.4rem 1rem 2rem;
    font-size: 0.82rem;
    font-style: italic;
    color: var(--sepia-pale);
    letter-spacing: 0.03em;
    border-top: 1px solid var(--rule);
    margin-top: 0.5rem;
}

/* ---- Decorative quill motif ---- */
.quill-motif {
    font-size: 1.6rem;
    display: block;
    margin-bottom: 0.4rem;
    opacity: 0.55;
    filter: sepia(1);
}
"""


# ---------------------------------------------------------------------------
# Gradio Blocks interface
# ---------------------------------------------------------------------------

with gr.Blocks(title="Graphology AI Agent") as demo:

    # -- Header --
    gr.HTML("""
        <div class="app-header">
            <span class="quill-motif">✒️</span>
            <p class="app-title">Graphology AI Agent</p>
            <p class="app-subtitle">
                Upload a clear image of your handwriting and receive a personality
                insight based on traditional graphology observations.
            </p>
        </div>
    """)

    with gr.Column(elem_classes="panel-card"):

        # Row 1 — Image upload
        image_input = gr.Image(
            type="filepath",
            label="Upload Handwriting Image",
            elem_classes="upload-zone",
        )

        # Row 2 — Analyze button
        analyze_btn = gr.Button(
            "🔍 Analyze Handwriting",
            variant="primary",
            elem_classes="analyze-btn",
        )

        # Row 3 — Personality traits output
        personality_output = gr.Textbox(
            label="Personality Traits",
            lines=10,
            interactive=False,
            placeholder="Your personality analysis will appear here after the image is processed…",
        )

        # Row 4 — Disclaimer output
        disclaimer_output = gr.Textbox(
            label="Disclaimer",
            lines=3,
            interactive=False,
            placeholder="Disclaimer will appear here…",
        )

    # -- Footer --
    gr.HTML("""
        <div class="app-footer">
            This analysis is for reflective purposes only.
        </div>
    """)

    # -- Event binding --
    analyze_btn.click(
        fn=analyze_handwriting,
        inputs=[image_input],
        outputs=[personality_output, disclaimer_output],
        api_name="analyze",
    )


# ---------------------------------------------------------------------------
# Launch
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    demo.launch(server_port=7863, share=False, theme=gr.themes.Soft())