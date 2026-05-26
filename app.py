import streamlit as st

st.set_page_config(
    page_title="NQDC Scenario Calculator | Forecast Capital Management",
    page_icon="📊",
    layout="wide"
)

st.markdown("""
    <style>
        #root > div:first-child { padding: 0; }
        .block-container { padding: 0 !important; max-width: 100% !important; }
        header { display: none !important; }
        footer { display: none !important; }
        div[data-testid="stLinkButton"] a {
            background: #c9a84c;
            color: #0c1824 !important;
            font-weight: 500;
            padding: 0.9rem 2rem;
            border-radius: 2px;
            text-decoration: none;
            font-size: 0.85rem;
            letter-spacing: 0.02em;
        }
        div[data-testid="stLinkButton"] a:hover {
            background: #e4c97a;
        }
    </style>
""", unsafe_allow_html=True)

with open("nqdc_calculator.html", "r") as f:
    html_content = f.read()

st.components.v1.html(html_content, height=1800, scrolling=True)

col1, col2, col3 = st.columns([2, 1, 2])
with col2:
    st.link_button(
        "Book a 30-Minute Review →",
        "https://calendly.com/forecastcapitalmanagement/forecastmeeting"
    )
