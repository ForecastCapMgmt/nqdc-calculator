import streamlit as st

st.set_page_config(
    page_title="NQDC Scenario Calculator | Forecast Capital Management",
    page_icon="📊",
    layout="wide"
)

# Remove default Streamlit padding and footer
st.markdown("""
    <style>
        #root > div:first-child { padding: 0; }
        .block-container { padding: 0 !important; max-width: 100% !important; }
        header { display: none !important; }
        footer { display: none !important; }
    </style>
""", unsafe_allow_html=True)

with open("nqdc_calculator.html", "r") as f:
    html_content = f.read()

st.components.v1.html(html_content, height=1800, scrolling=True)
