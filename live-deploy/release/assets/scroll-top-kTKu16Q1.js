const t=document.createElement("button");t.innerHTML="↑";t.title="Başa Dön";Object.assign(t.style,{position:"fixed",bottom:"20px",right:"20px",width:"45px",height:"45px",borderRadius:"50%",background:"#2e67d2",color:"white",border:"none",fontSize:"1.2rem",cursor:"pointer",zIndex:"9999",boxShadow:"0 4px 12px rgba(46,103,210,0.3)",transition:"opacity 0.2s, transform 0.2s",opacity:"0",pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center"});document.body.appendChild(t);window.addEventListener("scroll",()=>{window.scrollY>100?(t.style.opacity="1",t.style.pointerEvents="auto"):(t.style.opacity="0",t.style.pointerEvents="none")});t.addEventListener("click",()=>{window.scrollTo({top:0,left:0,behavior:"smooth"})});const o=document.createElement("style");o.textContent=`
  .back-link, .ipc-back, #home-return {
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.5rem !important;
    background: rgba(255, 255, 255, 0.12) !important;
    padding: 0.45rem 0.9rem !important;
    border-radius: 8px !important;
    color: #ffffff !important;
    text-decoration: none !important;
    font-weight: 600 !important;
    font-size: 0.88rem !important;
    transition: all 0.2s ease !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    cursor: pointer !important;
  }
  .back-link:hover, .ipc-back:hover, #home-return:hover {
    background: rgba(255, 255, 255, 0.25) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    transform: translateY(-1px) !important;
    color: #ffffff !important;
  }
  @media (max-width: 760px) {
    .back-link, .ipc-back, #home-return {
      font-size: 0 !important;
      width: 36px !important;
      height: 36px !important;
      padding: 0 !important;
      justify-content: center !important;
      letter-spacing: 0 !important;
    }
    .back-link::after, .ipc-back::after, #home-return::after {
      content: "🏠" !important;
      font-size: 18px !important;
      display: block !important;
    }
  }
`;document.head.appendChild(o);function n(){document.querySelectorAll('.back-link, .ipc-back, #home-return, a[href="/"]').forEach(e=>{e.dataset.smartBackInit||(e.dataset.smartBackInit="true",e.setAttribute("href","/"),e.addEventListener("click",r=>{r.preventDefault(),window.location.assign("/")}))})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",n):n();setTimeout(n,500);
