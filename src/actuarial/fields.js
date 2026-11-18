export const defaults = {
  kararTarihi:null,tahkikatBaslangic:null,tahkikatBaslamadi:false,
  calculationMode:'igt',kazaTarihi:'',hesapTarihi:new Date().toISOString().slice(0,10),dogumTarihi:'',courtName:'',fileNumber:'',davaKonusu:'Alacak',sgkSigortasiz5510_23:false,davaci:'',magdur:'',magdurMedeniHal:'Evli',magdurCinsiyet:'Erkek',egitimDurumu:'Lise',askerlikDurumu:'Yapıldı',askerlikKuralSecimi:'Standart',emeklilikYasi:60,hayatTablosu:'TRH-2010 Erkek',omurYontemi:'Bakiye Ömür',eksiltmeYontemi:'Progresif Rant',eksiltmeOrani:1.65,artisOrani:10,progresifRantIskontoOrani:10,endeksSecimi:'Yasal Faiz',yasalFaizUygula:true,ucretTipi:'Asgari Ücret',ggoDegeri:1,geciciIGVar:false,geciciBaslangic:null,geciciBitis:null,surekliIGVar:true,surekliBaslangic:null,surekliMaluliyetOrani:10,bakiciVar:false,bakiciBelgeli:false,bakiciBaslangic:null,bakiciBitis:null,bakiciTutar:0,calisma60Var:false,calisma65Var:false,yetistirmeGideriVar:false,magdurKusur:0,trafikSigortaTavani:null,davalilar:[],destekGorenler:[],dulEsEvlenmeRows:[],pesinOdemeler:[],sgkOdemeler:[],trafikOdemeler:[],bordroluUcretler:[],
};
// key, label, input kind/options. These keys match IGTInputSnapshot one-to-one.
export const groups = [
  ['Dosya ve kişi',[
    ['calculationMode','Hesap türü',['igt','dykt']],['courtName','Mahkeme','text'],['fileNumber','Dosya numarası','text'],['davaKonusu','Dava konusu',['Alacak','Rücu','Trafik']],['davaci','Davacı','text'],['magdur','Mağdur','text'],['dogumTarihi','Doğum tarihi','date'],['kazaTarihi','Kaza / ölüm tarihi','date'],['hesapTarihi','Hesap tarihi','date'],['magdurCinsiyet','Cinsiyet',['Erkek','Kadın']],['magdurMedeniHal','Medeni hal',['Evli','Bekâr']],['magdurKusur','Mağdur kusuru (%)','number'],['sgkSigortasiz5510_23','Sigortasız çalışma — 5510/23','checkbox'],
  ]],
  ['Hesap yöntemi ve gelir',[
    ['emeklilikYasi','Emeklilik yaşı','number'],['hayatTablosu','Yaşam tablosu','life'],['omurYontemi','Ömür yöntemi',['Bakiye Ömür','Tam Ömür']],['eksiltmeYontemi','İskonto yöntemi',['Progresif Rant','Sabit İskonto']],['eksiltmeOrani','İskonto (%)','number'],['artisOrani','PR artış (%)','number'],['progresifRantIskontoOrani','PR iskonto (%)','number'],['endeksSecimi','Ödeme güncelleme endeksi',['Yasal Faiz','Asgari Ücret']],['yasalFaizUygula','Yasal faiz uygula','checkbox'],['ucretTipi','Gelir türü',['Asgari Ücret','Güncel Ücret','Bordrolu Ücret']],['ggoDegeri','Gelir / asgari ücret oranı (GGO)','number'],['trafikSigortaTavani','Trafik sigortası tavanı (TL)','number'],['calisma60Var','60 yaş sonrası çalışması var','checkbox'],['calisma65Var','65 yaş sonrası çalışması var','checkbox'],
  ]],
  ['İş göremezlik ve bakıcı',[
    ['geciciIGVar','Geçici iş göremezlik','checkbox'],['geciciBaslangic','Geçici başlangıç','date'],['geciciBitis','Geçici bitiş','date'],['surekliIGVar','Sürekli iş göremezlik','checkbox'],['surekliBaslangic','Sürekli başlangıç','date'],['surekliMaluliyetOrani','Maluliyet (%)','number'],['bakiciVar','Bakıcı gideri','checkbox'],['bakiciBelgeli','Bakıcı gideri belgeli','checkbox'],['bakiciBaslangic','Bakıcı başlangıç','date'],['bakiciBitis','Bakıcı bitiş','date'],['bakiciTutar','Belgeli bakıcı gideri (TL)','number'],
  ]],
  ['Destek ve askerlik kuralları',[
    ['yetistirmeGideriVar','Yetiştirme gideri indirimi','checkbox'],['egitimDurumu','Eğitim',['İlkokul','Ortaokul','Lise','Üniversite','Yüksek Lisans','Doktora']],['askerlikDurumu','Askerlik',['Yapıldı','Muaf','Askere Gidecek']],['askerlikKuralSecimi','Askerlik kuralı',['Standart','Tecil','Kaza tarihinde 20 yaş']],
  ]],
  ['TBK 55 — faiz ve mahsup',[
    ['kararTarihi','Karar tarihi (karar yoksa boş bırakın)','date'],['tahkikatBaslangic','Tahkikat başlangıç tarihi','date'],['tahkikatBaslamadi','Tahkikat henüz başlamadı','checkbox'],
  ]],
];
export const rowGroups = {
  davalilar:{title:'Davalılar',fields:[['name','Ad','text'],['type','Tür',['İşveren','3. Kişi','Sigorta']],['kusur','Kusur (%)','number']]},
  destekGorenler:{title:'Destek görenler (DYKT)',fields:[['tip','Yakınlık',['Eş','Çocuk','Anne','Baba']],['ad','Ad','text'],['aktif','Aktif','checkbox'],['dogum','Doğum','date'],['cinsiyet','Cinsiyet',['Kadın','Erkek']],['cikisYasi','Çıkış yaşı','number'],['destekBaslangic','Destek başlangıç','date'],['ozelDestektenCikisNedeni','Özel çıkış nedeni','text'],['ozelDestektenCikisTarihi','Özel çıkış tarihi','date']]},
  pesinOdemeler:{title:'Peşin ödemeler',fields:[['davali','Ödeyen davalı','text'],['tarih','Tarih','date'],['tutar','Tutar (TL)','number'],['kime','Alıcı','text'],['ifaAmacli','İfa amacı taşıyor','checkbox'],['odemeTarihiTazminati','Ödeme tarihindeki sorumluluk tutarı (isteğe bağlı TL)','number']]},
  sgkOdemeler:{title:'SGK ödemeleri / PSD',fields:[['davali','Ödeyen','text'],['tarih','Tarih','date'],['tutar','Tutar (TL)','number'],['kime','Alıcı','text']]},
  trafikOdemeler:{title:'Trafik sigortası ödemeleri',fields:[['davali','Ödeyen','text'],['tarih','Tarih','date'],['tutar','Tutar (TL)','number'],['kime','Alıcı','text'],['ifaAmacli','İfa amacı taşıyor','checkbox'],['odemeTarihiTazminati','Ödeme tarihindeki sorumluluk tutarı (isteğe bağlı TL)','number']]},
  bordroluUcretler:{title:'Bordrolu net ücret dönemleri',fields:[['baslangic','Başlangıç','date'],['bitis','Bitiş','date'],['netUcret','Net ücret (TL)','number']]},
};
