import"./theme-Bw_c2Sos.js";import{s as d}from"./auth-pOM6EU60.js";import"./scroll-top-kTKu16Q1.js";const o=document.querySelector("#admin-app");function n(a){return String(a||"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}function p(a){return a?new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(Number(a))):"—"}function m(a){return{approved:"Onaylı",pending:"Bekliyor",rejected:"Reddedildi",blocked:"Kara listede"}[a]||"Bekliyor"}function l(a){const t=a.rejectionReason?`<p class="user-reason"><strong>Açıklama:</strong> ${n(a.rejectionReason)}</p>`:"",e=a.notificationStatus?`<span class="notify-badge ${a.notificationStatus==="sent"?"notify-sent":"notify-failed"}">${a.notificationStatus==="sent"?"Bildirim gönderildi":"Bildirim bekliyor"}</span>`:'<span class="notify-badge">Manuel takip</span>';return`<tr>
    <td>
      <strong>${n(a.email)}</strong>
      <div class="user-links">
        <a href="${n(a.mailto)}">E-posta yaz</a>
        <a href="${n(a.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp metni</a>
      </div>
      ${t}
    </td>
    <td><span class="provider-badge">${n(a.provider)}</span></td>
    <td>${p(a.createdAt)}</td>
    <td><span class="status-pill status-${n(a.status)}">${m(a.status)}</span>${e}</td>
    <td>
      <div class="admin-actions">
        ${a.status!=="approved"?`<button class="approve-btn" data-id="${n(a.id)}" type="button">Onayla</button>`:""}
        ${a.status!=="blocked"?`<button class="reject-btn" data-id="${n(a.id)}" type="button">Red ver</button>`:""}
        <button class="blacklist-btn" data-id="${n(a.id)}" type="button">Kara liste</button>
        <button class="delete-btn" data-id="${n(a.id)}" type="button">Sil</button>
      </div>
    </td>
  </tr>`}async function r(a,t,e=""){const i=await fetch(`/api/admin/users/${encodeURIComponent(a)}/${t}`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({reason:e})}),c=await i.json().catch(()=>({}));if(!i.ok)throw new Error(c.error||"İşlem tamamlanamadı.")}async function u(a){const t=await fetch(`/api/admin/users/${encodeURIComponent(a)}/delete`,{method:"DELETE",credentials:"same-origin"}),e=await t.json().catch(()=>({}));if(!t.ok)throw new Error(e.error||"Kullanıcı silinemedi.")}function h(){document.querySelector("#logout-button").onclick=async()=>{await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"}),window.location.href="/"},document.querySelectorAll(".approve-btn").forEach(a=>{a.onclick=async()=>{a.disabled=!0;try{await r(a.dataset.id,"approve"),await s()}catch(t){alert(t.message),a.disabled=!1}}}),document.querySelectorAll(".reject-btn").forEach(a=>{a.onclick=async()=>{const t=prompt("Kullanıcıya iletilecek red açıklamasını yazın:");if(t?.trim()){a.disabled=!0;try{await r(a.dataset.id,"reject",t),await s()}catch(e){alert(e.message),a.disabled=!1}}}}),document.querySelectorAll(".blacklist-btn").forEach(a=>{a.onclick=async()=>{const t=prompt("Kara liste açıklamasını yazın:");if(t?.trim()&&confirm("Bu kullanıcı kara listeye alınsın ve mevcut oturumları kapatılsın mı?")){a.disabled=!0;try{await r(a.dataset.id,"blacklist",t),await s()}catch(e){alert(e.message),a.disabled=!1}}}}),document.querySelectorAll(".delete-btn").forEach(a=>{a.onclick=async()=>{if(confirm("Kullanıcı kaydı kalıcı olarak silinsin mi?")){a.disabled=!0;try{await u(a.dataset.id),await s()}catch(t){alert(t.message),a.disabled=!1}}}})}function y(a){const t=a.users.filter(i=>i.status==="pending"),e=a.users.filter(i=>i.status!=="pending");o.innerHTML=`<header class="admin-topbar"><div><h1>Yönetici Paneli</h1></div><div class="admin-topbar-actions"><a href="/">Ana sayfa</a><button id="logout-button" type="button">Çıkış yap</button></div></header>
  <main class="admin-layout">
    <section class="admin-summary">
      <article><span>Toplam kullanıcı</span><strong>${a.counts.users}</strong></article>
      <article><span>Onay bekleyen</span><strong>${a.counts.pending}</strong></article>
      <article><span>Kara listede</span><strong>${a.counts.blocked}</strong></article>
      <article><span>Favori listesi</span><strong>${a.counts.lists}</strong></article>
    </section>
    <section class="admin-card pending-card">
      <div class="admin-card-heading"><div><p class="eyebrow">ONAY KUYRUĞU</p><h2>Bekleyen başvurular</h2></div><span>${t.length} başvuru</span></div>
      <div class="admin-table-wrap">${t.length?`<table><thead><tr><th>E-posta</th><th>Giriş yöntemi</th><th>Kayıt tarihi</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${t.map(l).join("")}</tbody></table>`:'<p class="empty-admin">Bekleyen başvuru yok.</p>'}</div>
    </section>
    <section class="admin-card">
      <div class="admin-card-heading"><div><p class="eyebrow">HESAP YÖNETİMİ</p><h2>Tüm kullanıcılar</h2></div><span>${a.users.length} kayıt</span></div>
      <div class="admin-table-wrap"><table><thead><tr><th>E-posta</th><th>Giriş yöntemi</th><th>Kayıt tarihi</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${e.map(l).join("")}</tbody></table></div>
    </section>
  </main>`,h()}async function s(){const a=await fetch("/api/admin/summary",{credentials:"same-origin",cache:"no-store"});if(a.status===401||a.status===403||a.status===404){o.innerHTML='<main class="admin-denied"><h1>Bu sayfa bulunamadı</h1><p>Yönetici yetkisi olan hesapla giriş yapmanız gerekir.</p><a href="/">Ana sayfaya dön</a></main>';return}if(!a.ok)throw new Error("Yönetici verileri yüklenemedi.");y(await a.json())}await d();s().catch(a=>{o.innerHTML=`<main class="admin-denied"><h1>Panel yüklenemedi</h1><p>${n(a.message)}</p><a href="/">Ana sayfaya dön</a></main>`});
