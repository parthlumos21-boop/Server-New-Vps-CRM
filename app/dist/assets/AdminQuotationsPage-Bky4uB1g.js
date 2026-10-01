import{ag as We,b0 as ht,ao as _a,B as xt,l as $e,am as bt,bN as gt,r as u,j as e,bH as w,bO as ft,bP as Nt,b1 as sa,b2 as jt,bQ as vt,u as yt,s as qt,Y as wt,bm as St,bz as _t,bG as At,bJ as Ct,D as Pt,bb as Tt,aX as Ft,G as It,H as Ot,aj as Lt,bM as Et,bL as zt,V as Qt}from"./index-zjmGk0Jf.js";const Ze=(a={})=>({id:a.id,userId:a.userId??a.user_id,companyId:a.companyId??a.company_id,entityType:a.entityType??a.entity_type??"",name:a.name??"",columns:Array.isArray(a.columns)?a.columns:[],filters:a.filters&&typeof a.filters=="object"?a.filters:{},sort:a.sort&&typeof a.sort=="object"?a.sort:{},isDefault:!!(a.isDefault??a.is_default),isShared:!!(a.isShared??a.is_shared)}),Xe={async listCustomViews(a){const s=await We.get("/custom-views",{params:a?{entityType:a}:{}});return(Array.isArray(s==null?void 0:s.data)?s.data:[]).map(Ze)},async createCustomView(a){const s=await We.post("/custom-views",a);return Ze((s==null?void 0:s.data)||{})},async updateCustomView(a,s){const l=await We.put(`/custom-views/${encodeURIComponent(a)}`,s);return Ze((l==null?void 0:l.data)||{})},async upsertCustomViewByName(a){const s=(a==null?void 0:a.entityType)||"",l=String((a==null?void 0:a.name)||"").trim(),r=(await this.listCustomViews(s)).find(i=>String(i.name||"").trim()===l)||null;return r!=null&&r.id?this.updateCustomView(r.id,a):this.createCustomView(a)}},Ye=6,Je=8,na="crm-admin-quotation-manager-layout",Aa="quotation_layout_preferences",Ca="Admin Quotation Manager Layout",$t=5*1024*1024,Rt=["pdf","xls","xlsx"],Pa={num:"",owner:"",date:"",company:"",amount:"",status:"",project:""},He={accountNumber:"",name:"",email:"",phone:"",accountOwner:""},kt=[{value:"",label:"Select"},{value:"open",label:"Open"},{value:"approved",label:"Approved"},{value:"customer_approved",label:"Customer Approved"},{value:"customer_rejected",label:"Customer Rejected"},{value:"rejected",label:"Rejected"},{value:"cancelled",label:"Cancelled"}],Ta=[{value:"INR",label:"INR"},{value:"USD",label:"USD"},{value:"AED",label:"AED"},{value:"NZD",label:"NZ$"},{value:"CAD",label:"CAD"},{value:"SEK",label:"SEK"},{value:"SGD",label:"SGD"},{value:"AUD",label:"AUD"},{value:"JPY",label:"JPY"},{value:"EUR",label:"Euro"},{value:"GBP",label:"GBP"},{value:"QAR",label:"QAR"},{value:"SAR",label:"SAR"},{value:"OMR",label:"OMR"}],Ea=()=>new Date().toISOString().slice(0,10),Ut=(a,s)=>{const l=new Date(a||Ea());return l.setDate(l.getDate()+s),l.toISOString().slice(0,10)},ea=()=>{const a=Ea();return{selectedAccountId:"",selectedAccountLabel:"",clientAccountNumber:"",companyName:"",contactPerson:"",address:"",email:"",phone:"",accountOwner:"",quoteNumber:"",quotationDate:a,totalAmount:"",amountCurrency:"INR",totalProductTax:"",taxCurrency:"INR",quotationStatus:"",validUntilDate:Ut(a,30),quoteFile:null,quoteFileName:""}},Ne=[{key:"num",label:"Quotation Number",exportValue:a=>a.num},{key:"date",label:"Quotation Date",exportValue:a=>a.date},{key:"owner",label:"Quotation Owner",exportValue:a=>a.owner},{key:"company",label:"Company Name",exportValue:a=>a.company},{key:"project",label:"Project Name",exportValue:a=>a.project},{key:"amount",label:"Amount",exportValue:a=>a.amountLabel},{key:"status",label:"Status",exportValue:a=>a.statusLabel}],Mt=[{key:"num",label:"Quotation Number",type:"text",width:18},{key:"date",label:"Quotation Date",type:"date",align:"center",width:18},{key:"owner",label:"Quotation Owner",type:"text",width:22},{key:"company",label:"Company Name",type:"text",width:28},{key:"project",label:"Project Name",type:"text",width:28},{key:"amountLabel",label:"Amount",type:"text",width:18},{key:"statusLabel",label:"Status",type:"text",width:16}],ze=["num","owner","date","amount","status","company","project"],ca=(a=[],s="deal")=>{const l=a.filter(Boolean),r=(s==="account"?["num","owner","date","company","amount","status","project"]:["num","owner","date","amount","status","company","project"]).filter(i=>l.includes(i));return l.forEach(i=>{r.includes(i)||r.push(i)}),r},Fa=()=>{try{const a=window.localStorage.getItem(na),s=a?JSON.parse(a):null,l=Array.isArray(s==null?void 0:s.selectedFields)&&s.selectedFields.length>0?s.selectedFields.filter(o=>Ne.some(r=>r.key===o)):ze;return{selectedFields:ca(l)}}catch{return{selectedFields:ze}}},aa=(a={})=>{const s=Array.isArray(a==null?void 0:a.selectedFields)&&a.selectedFields.length>0?a.selectedFields.filter(l=>Ne.some(o=>o.key===l)):ze;return{selectedFields:ca(s.length>0?s:ze)}},A={brandKey:"swati",organizationName:"Swati Switchgears India Pvt Ltd",organizationLegalName:"Swati Switchgears (India) Pvt. Ltd.",organizationAddress:"36 Shubhlaxmi Industrial Estate, Sarkhej Bavla Road, Changodar, Ahmedabad - 382210",organizationAddressLines:["36 Shubhlaxmi Industrial Estate,","Sarkhej Bavla Road, Changodar,","Ahmedabad - 382210"],organizationEmail:"mkt@swatiswitchgears.com",organizationPhone:"9913536307",organizationGstin:"24AAACZ0615P1Z7",organizationStateCode:"24",website:"www.swatiswitchgears.com",organizationTagline:"",logoType:"image"},oa={brandKey:"lumos",organizationName:"Lumos Building Automation Pvt Ltd",organizationLegalName:"Lumos Building Automation Pvt. Ltd.",organizationAddress:"Vadodara, Gujarat, India",organizationEmail:"sales@lumosbuildingautomation.com",organizationPhone:"+91 265 4000 222",organizationGstin:"24AAECL9020K1ZY",organizationStateCode:"24",website:"www.lumosbuildingautomation.com",organizationTagline:"Building automation, controls and smart infrastructure solutions.",logoType:"image"},Ia={swati:A,"swati-switch":A,"swati-switch-gear":A,lumos:oa,"lumos-building":oa},da=[{key:"pdf",label:"View As PDF",icon:ht,iconClass:"aqp-action-icon--pdf"},{key:"preview",label:"Preview",icon:_a},{key:"view",label:"View Quote",icon:_a},{key:"approve",label:"Approve Quote",icon:xt},{key:"reject",label:"Reject Quote",icon:$e},{key:"clone",label:"Clone Quote",icon:bt},{key:"account",label:"View Account",icon:gt}],v=a=>String(a||"").trim().toLowerCase(),Oa=a=>String(a||"").split(/\r?\n|,/).map(s=>s.trim()).filter(Boolean),Dt=(a={})=>[a.address,a.location,a.state].filter(Boolean).join(", "),Vt=(a="")=>{const s=String(a||"").split(".");return s.length>1?v(s.pop()):""},La=a=>{if(!a)return"Quote File is required.";const s=Vt(a.name);return Rt.includes(s)?a.size>$t?"Quote File size must be 5 MB or less.":"":"Only PDF, XLS and XLSX files are allowed."},Re=(a={})=>{const s=v(a.profileKey);if(s&&Ia[s])return Ia[s];const l=v(a.profileName||a.organizationName);return l.includes("swati")?A:l.includes("lumos")?oa:{}},Bt=(a={})=>Re(a).brandKey==="swati",Gt=(a={})=>Re(a).brandKey==="lumos",pa=a=>a==="lumos"?Et:a==="swati"?zt:null,za=a=>a==="lumos"?"lumos":a==="swati"?"swati":"",Kt=(a={})=>{const s=Re(a);return s.logoType?s.logoType==="image":v(a.profileName||a.organizationName).includes("swati")},Qa=a=>{if(!a)return"-";const s=new Date(a);if(Number.isNaN(s.getTime()))return String(a);const l=String(s.getDate()).padStart(2,"0"),o=String(s.getMonth()+1).padStart(2,"0"),r=s.getFullYear();return`${l}-${o}-${r}`},ta=a=>{if(!a)return"-";const s=new Date(a);return Number.isNaN(s.getTime())?String(a):new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(s)},S=a=>{const s=Number.parseFloat(a);return Number.isFinite(s)?s:0},d=a=>String(a||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),ua=a=>{const s=v(a).replace(/[\s-]+/g,"_");return s?s==="accepted"?"approved":s==="new"?"draft":s:"draft"},je=a=>{const s=ua(a),l={draft:"Draft",sent:"Sent",approved:"Approved",rejected:"Rejected",cancelled:"Cancelled",open:"Open"};return l[s]?l[s]:s.split("_").map(o=>o.charAt(0).toUpperCase()+o.slice(1)).join(" ")},$a=a=>{const s=ua(a);return s==="approved"?"aqp-status--approved":s==="rejected"?"aqp-status--rejected":s==="sent"?"aqp-status--sent":"aqp-status--open"},la=a=>{const s=ua(a);return s==="approved"||s==="cancelled"?"aqp-num-badge--orange":"aqp-num-badge--teal"},Wt=(a={})=>[a==null?void 0:a.name,a==null?void 0:a.username,a==null?void 0:a.email].map(s=>v(s)).filter(Boolean),Zt=(a,s)=>{var y,j,P,f,T;const l=v(a==null?void 0:a.role);if(l==="admin"||l==="super_admin")return da.map(F=>F.key);const r=[s==null?void 0:s.owner,(y=s==null?void 0:s.raw)==null?void 0:y.selectedAccountOwner,(j=s==null?void 0:s.raw)==null?void 0:j.ownerName,(P=s==null?void 0:s.raw)==null?void 0:P.createdBy].map(F=>v(F)),i=Wt(a),x=r.some(F=>F&&i.includes(F)),h=!!((f=a==null?void 0:a.permissions)!=null&&f.approveQuotes||(T=a==null?void 0:a.permissions)!=null&&T.approveQuotation);if(l==="viewer"||!x&&!h)return["pdf","preview","view"];const N=["pdf","preview","view","clone"];return h&&N.push("approve","reject"),N},ra=(a,s)=>{const l=new Set(Zt(a,s));return da.filter(o=>l.has(o.key))},ia=(a,s)=>{const o=Math.max(1,a-Math.floor(2.5)),r=Math.min(s,o+5-1),i=Math.max(1,r-5+1);return Array.from({length:r-i+1},(x,h)=>i+h)},Q=a=>a||"-",Xt=(...a)=>a.map(s=>String(s||"").trim()).filter(Boolean).join(", "),Ra=(a={})=>{const l=(Array.isArray(a.lineItems)?a.lineItems:[]).filter(r=>String((r==null?void 0:r.description)||"").trim()).map((r,i)=>{const x=S(r.quantity||0),h=S(r.rate||0),N=Number.isFinite(Number(r.amount))?Number(r.amount):x*h;return{id:r.id||`line-${i+1}`,srNo:i+1,description:r.description,quantity:x,unit:r.unit||"Nos",rate:h,amount:N}});if(l.length>0)return l;const o=[a.product,a.otherProduct,a.otherService,a.projectName].filter(Boolean).join(" / ");return!o&&!S(a.amount)?[]:[{id:a.id||"line-1",srNo:1,description:o||a.companyName||"Quotation Item",quantity:1,unit:"Nos",rate:S(a.amount),amount:S(a.amount)}]},ka=a=>{const s=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine"],l=["Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"],o=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];return a===0?"":a<10?s[a]:a<20?l[a-10]:a<100?`${o[Math.floor(a/10)]}${a%10?` ${s[a%10]}`:""}`:`${s[Math.floor(a/100)]} Hundred${a%100?` ${ka(a%100)}`:""}`},Yt=a=>{const s=Math.floor(Math.abs(S(a)));if(!s)return"Zero";const l=[{divisor:1e7,label:"Crore"},{divisor:1e5,label:"Lakh"},{divisor:1e3,label:"Thousand"},{divisor:1,label:""}];let o=s;const r=[];return l.forEach(({divisor:i,label:x})=>{if(o>=i){const h=Math.floor(o/i);o%=i,h>0&&(r.push(ka(h)),x&&r.push(x))}}),r.join(" ").trim()},Ua=(a,s)=>{if(!a)return null;const l=s.find(i=>String(i.id)===String(a.selectedAccountId||""));if(l)return l;const o=v(a.clientAccountNumber);if(o){const i=s.find(x=>v(x.accountNumber)===o);if(i)return i}const r=v(a.companyName);if(r){const i=s.find(x=>v(x.name)===r);if(i)return i}return null},Ee=(a,s)=>{var L,pe,Y;const l=Re(a),o=l.brandKey?l:A,r=Bt(a)||!l.brandKey,i=Gt(a),x=!!l.brandKey,h=o.brandKey||(r?"swati":i?"lumos":"swati"),N=pa(h),y=Ra(a),j=y.reduce((ke,R)=>ke+S(R.amount),0),P=S(a.cgstAmount||a.cgst||0),f=S(a.sgstAmount||a.sgst||0),T=S(a.igstAmount||a.igst||0),F=S(a.taxAmount||0),ve=S(a.amount),Z=j+P+f+T+F,ie=ve>0?Math.max(ve,Z):Z,ye=a.logoType||l.logoType||(Kt(a)?"image":"text"),I=a.clientAddressDetails||Xt(s==null?void 0:s.address,s==null?void 0:s.location,s==null?void 0:s.state)||"-",$=x?o.organizationName:a.organizationName||o.organizationName||a.profileName||A.organizationName,qe=x?o.organizationLegalName||$:a.organizationLegalName||o.organizationLegalName||$,ce=x?o.organizationAddress||"":a.organizationAddress||o.organizationAddress||A.organizationAddress,X=o.organizationAddressLines||Oa(ce),we=x?o.organizationEmail||"":a.organizationEmail||o.organizationEmail||A.organizationEmail,de=x?o.organizationPhone||"":a.organizationPhone||o.organizationPhone||A.organizationPhone,Se=x?o.organizationGstin||"":a.organizationGstin||o.organizationGstin||A.organizationGstin,O=x?o.organizationStateCode||"":a.organizationStateCode||o.organizationStateCode||A.organizationStateCode;return{id:a.id,quotationNumber:a.quotationNumber||"-",quotationDate:ta(a.quotationDate||a.createdAt),validUntil:ta(a.validUntil),currency:a.currency||o.currency||"INR",statusLabel:je(a.status),profileName:a.profileName||"-",brandKey:h,brandClassName:za(h),logoSource:N,isSwatiDocument:r,isLumosDocument:i,organizationName:$,organizationLegalName:qe,organizationAddress:ce,organizationAddressLines:X,organizationEmail:we,organizationPhone:de,organizationGstin:Se,organizationStateCode:O,website:x?o.website||"":a.website||o.website||A.website,organizationTagline:a.organizationTagline||o.organizationTagline||"",logoType:ye,companyName:a.companyName||(s==null?void 0:s.name)||"-",clientAccountNumber:a.clientAccountNumber||(s==null?void 0:s.accountNumber)||"-",contactPerson:a.contactPerson||(s==null?void 0:s.contactPerson)||"-",telephone:a.telephone||(s==null?void 0:s.phone)||(s==null?void 0:s.contactPhone)||"-",email:a.email||(s==null?void 0:s.email)||(s==null?void 0:s.contactEmail)||"-",gstin:a.gstin||(s==null?void 0:s.gstin)||"-",stateCode:a.stateCode||(s==null?void 0:s.stateCode)||"-",accountOwner:(s==null?void 0:s.accountOwnerDisplay)||a.selectedAccountOwner||(s==null?void 0:s.accountOwner)||"-",customerReferenceNumber:((L=a.customerReference)==null?void 0:L.number)||"-",customerReferenceDate:ta((pe=a.customerReference)==null?void 0:pe.date),customerReferenceSubject:((Y=a.customerReference)==null?void 0:Y.subject)||"-",quotationSubject:a.quotationSubject||"-",projectName:a.projectName||"-",clientAddressDetails:I,clientAddressLines:Oa(I==="-"?"":I),product:a.product||"-",otherProduct:a.otherProduct||"-",otherService:a.otherService||"-",deliveryTerms:a.deliveryTerms||"-",paymentTerms:a.paymentTerms||"-",warrantyTerms:a.warrantyTerms||"-",quotationNotes:a.quotationNotes||"-",rejectionReason:a.rejectionReason||"",lineItems:y,subtotal:j,cgst:P,sgst:f,igst:T,otherTax:F,total:ie,amountInWords:`${Yt(ie)} ${a.currency==="USD"?"US Dollars":a.currency==="EUR"?"Euros":"Rupees"} Only`}},Jt=[{key:"srNo",label:"Sr No",type:"integer",align:"center",width:8},{key:"description",label:"Description",align:"left",width:48,wrap:!0},{key:"quantity",label:"Qty",type:"number",align:"right",width:10},{key:"unit",label:"Unit",align:"center",width:10},{key:"rate",label:"Rate",type:"currency",align:"right",width:16},{key:"amount",label:"Amount",type:"currency",align:"right",width:18}],Ht=a=>{if(!a)return null;const s=h=>{const N=String(h??"").trim();return N&&N!=="-"?N:""},l=[{label:"Quotation No.",value:s(a.quotationNumber)},{label:"Quotation Date",value:s(a.quotationDate)},{label:"Valid Until",value:s(a.validUntil)},{label:"Status",value:s(a.statusLabel)},{label:"Currency",value:s(a.currency)},{label:"Profile",value:s(a.profileName)},{label:"Customer",value:s(a.companyName)},{label:"Account No.",value:s(a.clientAccountNumber)},{label:"Contact Person",value:s(a.contactPerson)},{label:"Telephone",value:s(a.telephone)},{label:"Email",value:s(a.email)},{label:"GSTIN",value:s(a.gstin)},{label:"State Code",value:s(a.stateCode)},{label:"Account Owner",value:s(a.accountOwner)},{label:"Customer Address",value:s(a.clientAddressDetails)},{label:"Project Name",value:s(a.projectName)},{label:"Quotation Subject",value:s(a.quotationSubject)},{label:"Inquiry Ref No",value:s(a.customerReferenceNumber)},{label:"Inquiry Ref Date",value:s(a.customerReferenceDate)},{label:"Inquiry Subject",value:s(a.customerReferenceSubject)},{label:"Delivery Terms",value:s(a.deliveryTerms)},{label:"Payment Terms",value:s(a.paymentTerms)},{label:"Warranty Terms",value:s(a.warrantyTerms)},{label:"Quotation Notes",value:s(a.quotationNotes)}].filter(h=>h.value);a.rejectionReason&&l.push({label:"Rejection Reason",value:a.rejectionReason});const o=(a.lineItems||[]).map(h=>({srNo:h.srNo,description:h.description,quantity:h.quantity,unit:h.unit,rate:h.rate,amount:h.amount})),r=[],i=(h,N)=>{!Number.isFinite(Number(N))||Number(N)===0||r.push({srNo:"",description:h,quantity:"",unit:"",rate:"",amount:Number(N)})};i("Subtotal",a.subtotal),i("CGST",a.cgst),i("SGST",a.sgst),i("IGST",a.igst),i("Other Tax",a.otherTax),i("Total",a.total),a.amountInWords&&r.push({srNo:"",description:`Amount in Words: ${a.amountInWords}`,quantity:"",unit:"",rate:"",amount:""});const x=[...o,...r];return{title:`Sales Quotation - ${s(a.quotationNumber)||"Draft"}`,subtitle:s(a.companyName)||s(a.organizationName),sheetName:"Quotation",companyName:a.organizationName,metadata:l,columns:Jt,rows:x}},Ma=a=>{const s=a.logoSource||pa(a.brandKey),l=a.brandClassName||za(a.brandKey),o=a.lineItems.map(i=>`
    <tr>
      <td class="text-center">${i.srNo}</td>
      <td class="description-cell">${d(i.description)}</td>
      <td class="text-center">${d(i.quantity)}</td>
      <td class="text-center">${d(i.unit)}</td>
      <td class="money">${d(w(i.rate,a.currency))}</td>
      <td class="money">${d(w(i.amount,a.currency))}</td>
    </tr>
  `).join(""),r=s?`<div class="logo-wrap logo-wrap--${d(l||"default")}"><img src="${s}" alt="${d(a.organizationName)}" class="logo logo--${d(l||"default")}" /></div>`:`<div class="logo-text">${d(a.organizationName)}</div>`;return`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${d(a.quotationNumber)} - Sales Quotation</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2933; background: #ffffff; }
        .print-shell { padding: 14px; }
        .print-toolbar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          width: 100%;
          max-width: 980px;
          margin: 0 auto 14px;
        }
        .print-toolbar button {
          padding: 10px 16px;
          border: 1px solid #1f6ea4;
          border-radius: 8px;
          background: linear-gradient(180deg, #3291d1 0%, #1f6ea4 100%);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .print-toolbar button:last-child {
          border-color: #c7d6e2;
          background: #ffffff;
          color: #355163;
        }
        .quotation-print {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #c9d5df;
        }
        .quotation-header {
          padding: 18px 16px 0;
          background: #ffffff;
        }
        .quotation-main {
          padding: 12px 16px 16px;
        }
        .quotation-footer {
          border-top: 1px solid #d5e0ea;
          padding: 12px 18px;
          text-align: center;
          font-size: 10.5px;
          line-height: 1.5;
          color: #52606d;
          background: #ffffff;
        }
        .brand-head {
          text-align: center;
          padding-bottom: 12px;
        }
        .logo-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 0;
          width: fit-content;
          max-width: 100%;
          margin: 0 auto 8px;
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
        }
        .logo {
          display: block;
          width: 213px;
          height: 142px;
          max-width: 100%;
          max-height: 152px;
          object-fit: contain;
          object-position: center;
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
          filter: none;
          opacity: 1;
        }
        .logo--swati {
          width: 196px;
          height: 148px;
          max-height: 159px;
        }
        .logo--lumos {
          width: 311px;
          height: 142px;
          max-height: 152px;
          background: transparent;
          border-radius: 0;
          padding: 0;
        }
        .logo-text {
          font-size: 18px;
          font-weight: 800;
          color: #164f7d;
          margin-bottom: 8px;
        }
        .company-name {
          margin: 0;
          font-size: 20px;
          line-height: 1.25;
          font-weight: 800;
          color: #102a43;
        }
        .company-contact {
          margin-top: 7px;
          font-size: 10px;
          line-height: 1.5;
          color: #52606d;
        }
        .party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .party-card {
          border: 1px solid #a9dfe3;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 10.5px;
          line-height: 1.42;
          background: #ffffff;
        }
        .section-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #1f6ea4;
          margin-bottom: 8px;
        }
        .field-row {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 8px;
          margin-top: 5px;
        }
        .field-row strong {
          color: #243b53;
          font-weight: 700;
        }
        .field-row span {
          min-width: 0;
          overflow-wrap: anywhere;
        }
        h1 {
          margin: 0;
          padding: 12px 14px;
          text-align: center;
          font-size: 19px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: 1px;
          border-top: 1px solid #d5e0ea;
          border-bottom: 1px solid #d5e0ea;
          color: #102a43;
        }
        h2, h3, p { margin: 0 0 6px; }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid #cbd9e3;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .meta-cell {
          padding: 9px 10px;
          border-right: 1px solid #d5e0ea;
          background: #f4f8fb;
        }
        .meta-cell:last-child { border-right: none; }
        .meta-label {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          color: #627d98;
          margin-bottom: 6px;
          letter-spacing: 0.04em;
        }
        .meta-value {
          font-size: 10px;
          font-weight: 700;
          color: #102a43;
        }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .items-table th,
        .items-table td {
          border: 1px solid #c9d5df;
          padding: 9px 8px;
          font-size: 10px;
          vertical-align: top;
        }
        .items-table th {
          background: #1f6ea4;
          color: #ffffff;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        .description-cell {
          overflow-wrap: anywhere;
          line-height: 1.45;
        }
        .text-center { text-align: center; }
        .money {
          text-align: right;
          white-space: nowrap;
        }
        .summary-layout {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
          margin-top: 10px;
        }
        .summary-card,
        .totals-card,
        .terms-card {
          border: 1px solid #a9dfe3;
          border-radius: 10px;
          padding: 10px 12px;
          background: #ffffff;
        }
        .summary-card,
        .totals-card { min-height: 158px; }
        .detail-row,
        .total-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 5px 0;
          border-bottom: 1px solid #edf2f7;
          font-size: 10px;
        }
        .detail-row:last-child,
        .total-row:last-child { border-bottom: none; }
        .detail-row strong,
        .total-row strong { color: #243b53; }
        .detail-row span,
        .total-row span {
          text-align: right;
          overflow-wrap: anywhere;
        }
        .totals-table td {
          padding: 7px 8px;
          border-bottom: 1px solid #d9e2ec;
          font-size: 11px;
        }
        .totals-table td:last-child { text-align: right; }
        .totals-table tr:last-child td { border-bottom: none; }
        .grand-total td {
          border-top: 2px solid #1f6ea4;
          font-weight: 700;
          background: #eff6ff;
        }
        .amount-words {
          margin-top: 12px;
          border: 1px solid #cbd9e3;
          border-radius: 4px;
          padding: 9px 10px;
          font-size: 10px;
          line-height: 1.5;
          background: #f4f8fb;
        }
        .amount-words strong {
          display: block;
          margin-bottom: 4px;
          color: #102a43;
        }
        .terms-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 10px;
        }
        .terms-title {
          margin: 0 0 8px;
          font-size: 9px;
          text-transform: uppercase;
          color: #1f6ea4;
        }
        .terms-value {
          font-size: 10px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        @page {
          size: A4;
          margin: 10mm;
        }
        @media print {
          body { background: #ffffff; }
          .print-shell { padding: 0; }
          .print-toolbar { display: none; }
          .quotation-print { max-width: none; border: none; }
          .quotation-header { padding: 0 0 0; }
          .quotation-main { padding: 14px 0 16px; }
          .items-table thead { display: table-header-group; }
          tr, .party-card, .summary-card, .totals-card, .terms-card, .amount-words { page-break-inside: avoid; }
        }
        @media (max-width: 840px) {
          .print-shell { padding: 12px; }
          .party-grid,
          .meta-grid,
          .summary-layout,
          .terms-grid {
            grid-template-columns: 1fr;
          }
          .meta-cell { border-right: none; border-bottom: 1px solid #d5e0ea; }
          .meta-cell:last-child { border-bottom: none; }
        }
      </style>
    </head>
    <body>
      <div class="print-shell">
        <div class="print-toolbar">
          <button type="button" onclick="window.print()">Print / Save PDF</button>
          <button type="button" onclick="window.close()">Close</button>
        </div>
        <div class="quotation-print">
          <div class="quotation-header">
            <div class="brand-head">
              ${r}
              <h2 class="company-name">${d(a.organizationName)}</h2>
              <div class="company-contact">
                ${d(a.organizationAddress)}<br />
                Email: ${d(a.organizationEmail)} | Phone: ${d(a.organizationPhone)} | GSTIN: ${d(a.organizationGstin)}
              </div>
            </div>
            <div class="party-grid">
              <div class="party-card">
                <div class="section-label">Customer Details</div>
                <div class="field-row"><strong>Customer Name</strong><span>${d(a.companyName)}</span></div>
                <div class="field-row"><strong>Client Account No.</strong><span>${d(a.clientAccountNumber)}</span></div>
                <div class="field-row"><strong>Contact Person</strong><span>${d(a.contactPerson)}</span></div>
                <div class="field-row"><strong>Phone</strong><span>${d(a.telephone)}</span></div>
                <div class="field-row"><strong>Email</strong><span>${d(a.email)}</span></div>
                <div class="field-row"><strong>GSTIN</strong><span>${d(a.gstin)}</span></div>
                <div class="field-row"><strong>Address</strong><span>${d(a.clientAddressDetails)}</span></div>
              </div>
              <div class="party-card">
                <div class="section-label">Sales Details</div>
                <div class="field-row"><strong>Sales Executive</strong><span>${d(a.accountOwner)}</span></div>
                <div class="field-row"><strong>Mobile Number</strong><span>${d(a.organizationPhone)}</span></div>
                <div class="field-row"><strong>Email Address</strong><span>${d(a.organizationEmail)}</span></div>
                <div class="field-row"><strong>Quotation Reference</strong><span>${d(a.quotationNumber)}</span></div>
              </div>
            </div>
            <h1>SALES QUOTATION</h1>
          </div>
          <div class="quotation-main">
            <div class="meta-grid">
              <div class="meta-cell">
                <div class="meta-label">Quotation No.</div>
                <div class="meta-value">${d(a.quotationNumber)}</div>
              </div>
              <div class="meta-cell">
                <div class="meta-label">Quotation Date</div>
                <div class="meta-value">${d(a.quotationDate)}</div>
              </div>
              <div class="meta-cell">
                <div class="meta-label">Valid Until</div>
                <div class="meta-value">${d(a.validUntil)}</div>
              </div>
              <div class="meta-cell">
                <div class="meta-label">Currency</div>
                <div class="meta-value">${d(a.currency)}</div>
              </div>
            </div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width:56px;">Sr.</th>
                  <th>Description</th>
                  <th style="width:80px;">Qty</th>
                  <th style="width:90px;">Unit</th>
                  <th style="width:120px;">Rate</th>
                  <th style="width:140px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${o||'<tr><td colspan="6">No quotation items available.</td></tr>'}
              </tbody>
            </table>

            <div class="summary-layout">
              <div class="summary-card">
                <div class="section-label">Quotation Details</div>
                <div class="detail-row"><strong>Profile Name</strong><span>${d(a.profileName)}</span></div>
                <div class="detail-row"><strong>Project</strong><span>${d(a.projectName)}</span></div>
                <div class="detail-row"><strong>Account Owner</strong><span>${d(a.accountOwner)}</span></div>
                <div class="detail-row"><strong>Subject</strong><span>${d(a.quotationSubject)}</span></div>
                <div class="detail-row"><strong>Product</strong><span>${d([a.product,a.otherProduct].filter(i=>i&&i!=="-").join(" / ")||"-")}</span></div>
                <div class="detail-row"><strong>Service</strong><span>${d(a.otherService)}</span></div>
              </div>
              <div class="totals-card">
                <div class="section-label">Amount Summary</div>
                <div class="total-row"><strong>Sub Total</strong><span>${d(w(a.subtotal,a.currency))}</span></div>
                <div class="total-row"><strong>CGST</strong><span>${d(w(a.cgst,a.currency))}</span></div>
                <div class="total-row"><strong>SGST</strong><span>${d(w(a.sgst,a.currency))}</span></div>
                <div class="total-row"><strong>IGST</strong><span>${d(w(a.igst,a.currency))}</span></div>
                <div class="total-row"><strong>Other Tax</strong><span>${d(w(a.otherTax,a.currency))}</span></div>
                <div class="total-row grand-total"><strong>Total Amount</strong><span>${d(w(a.total,a.currency))}</span></div>
              </div>
            </div>

            <div class="amount-words"><strong>Amount in Words</strong>${d(a.amountInWords)}</div>

            <div class="terms-grid">
              <div class="terms-card">
                <h3 class="terms-title">Inquiry Reference</h3>
                <div class="terms-value">Number: ${d(a.customerReferenceNumber)}&#10;Date: ${d(a.customerReferenceDate)}&#10;Subject: ${d(a.customerReferenceSubject)}</div>
              </div>
              <div class="terms-card">
                <h3 class="terms-title">Terms &amp; Conditions</h3>
                <div class="terms-value">Delivery: ${d(a.deliveryTerms)}&#10;Payment: ${d(a.paymentTerms)}&#10;Warranty: ${d(a.warrantyTerms)}</div>
              </div>
              <div class="terms-card">
                <h3 class="terms-title">Quotation Notes</h3>
                <div class="terms-value">${d(a.quotationNotes)}</div>
              </div>
              <div class="terms-card">
                <h3 class="terms-title">Status</h3>
                <div class="terms-value">Status: ${d(a.statusLabel)}${a.rejectionReason?`&#10;Reason: ${d(a.rejectionReason)}`:""}</div>
              </div>
            </div>
          </div>
          <div class="quotation-footer">
            <strong>${d(a.organizationName)}</strong><br />
            Website: ${d(a.website||A.website)} | Email: ${d(a.organizationEmail)} | Phone: ${d(a.organizationPhone)}
          </div>
        </div>
      </div>
    </body>
  </html>`},re=a=>{if(!a)return;const s=document.title,l=`Quotation-${(a==null?void 0:a.quotationNumber)||"Document"}.pdf`,o=document.createElement("iframe");let r=null;o.title=l,o.setAttribute("aria-hidden","true"),o.style.position="fixed",o.style.left="-10000px",o.style.top="0",o.style.width="1024px",o.style.height="768px",o.style.border="0",o.style.opacity="0";const i=()=>{r&&window.clearTimeout(r),document.title=s,window.removeEventListener("afterprint",i),o.parentNode&&o.parentNode.removeChild(o)},x=()=>{const h=o.contentDocument;if(!h)return Promise.resolve();const N=Array.from(h.images||[]);return Promise.all(N.map(y=>y.complete?Promise.resolve():new Promise(j=>{y.onload=j,y.onerror=j})))};o.onload=()=>{x().then(()=>{const h=o.contentWindow;if(!h){i();return}document.title=l,window.addEventListener("afterprint",i),r=window.setTimeout(i,2500),h.focus(),h.print()})},document.title=l,document.body.appendChild(o),o.srcdoc=Ma(a)};function Da({status:a}){return e.jsx("span",{className:`aqp-status ${$a(a)}`,children:je(a)})}function M({title:a,onClose:s,size:l="",children:o,footer:r}){return u.useEffect(()=>{const i=x=>{x.key==="Escape"&&s()};return document.addEventListener("keydown",i),()=>document.removeEventListener("keydown",i)},[s]),e.jsx("div",{className:"aqp-overlay",role:"presentation",onClick:s,children:e.jsxs("div",{className:`aqp-modal ${l}`.trim(),role:"dialog","aria-modal":"true",onClick:i=>i.stopPropagation(),children:[e.jsxs("div",{className:"aqp-modal-header",children:[e.jsx("span",{className:"aqp-modal-title",children:a}),e.jsx("button",{type:"button",className:"aqp-modal-close",onClick:s,"aria-label":"Close",children:e.jsx($e,{})})]}),e.jsx("div",{className:"aqp-modal-body",children:o}),r?e.jsx("div",{className:"aqp-modal-footer",children:r}):null]})})}function Qe({documentData:a}){const s=a.logoSource||pa(a.brandKey),l=a.isLumosDocument?"lumos":a.isSwatiDocument?"swati":"default",o=[a.product,a.otherProduct].filter(r=>r&&r!=="-").join(" / ")||"-";return e.jsx("div",{className:"aqp-doc aqp-print-scope",children:e.jsxs("div",{className:"aqp-doc__frame",children:[e.jsxs("div",{className:"aqp-doc__brand-head",children:[e.jsx("div",{className:`aqp-doc__logo-wrap aqp-doc__logo-wrap--${l}`,children:s?e.jsx("img",{src:s,alt:a.organizationName,className:`aqp-doc__brand-logo aqp-doc__brand-logo--${l}`}):e.jsx("div",{className:"aqp-doc__text-logo",children:a.organizationName})}),e.jsx("h2",{children:a.organizationName}),e.jsxs("p",{children:[a.organizationAddress,e.jsx("br",{}),"Email: ",a.organizationEmail," | Phone: ",a.organizationPhone," | GSTIN: ",a.organizationGstin]})]}),e.jsxs("div",{className:"aqp-doc__party-grid",children:[e.jsxs("section",{className:"aqp-doc__party-card",children:[e.jsx("div",{className:"aqp-doc__eyebrow",children:"Customer Details"}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Customer Name"}),e.jsx("span",{children:a.companyName})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Client Account No."}),e.jsx("span",{children:a.clientAccountNumber})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Contact Person"}),e.jsx("span",{children:a.contactPerson})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Phone"}),e.jsx("span",{children:a.telephone})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Email"}),e.jsx("span",{children:a.email})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"GSTIN"}),e.jsx("span",{children:a.gstin})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Address"}),e.jsx("span",{children:a.clientAddressDetails})]})]}),e.jsxs("section",{className:"aqp-doc__party-card",children:[e.jsx("div",{className:"aqp-doc__eyebrow",children:"Sales Details"}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Sales Executive"}),e.jsx("span",{children:a.accountOwner})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Mobile Number"}),e.jsx("span",{children:a.organizationPhone})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Email Address"}),e.jsx("span",{children:a.organizationEmail})]}),e.jsxs("div",{className:"aqp-doc__field-row",children:[e.jsx("strong",{children:"Quotation Reference"}),e.jsx("span",{children:a.quotationNumber})]})]})]}),e.jsx("div",{className:"aqp-doc__title",children:"SALES QUOTATION"}),e.jsxs("div",{className:"aqp-doc__meta",children:[e.jsxs("div",{className:"aqp-doc__meta-cell",children:[e.jsx("span",{className:"aqp-doc__meta-label",children:"Quotation No."}),e.jsx("strong",{children:a.quotationNumber})]}),e.jsxs("div",{className:"aqp-doc__meta-cell",children:[e.jsx("span",{className:"aqp-doc__meta-label",children:"Quotation Date"}),e.jsx("strong",{children:a.quotationDate})]}),e.jsxs("div",{className:"aqp-doc__meta-cell",children:[e.jsx("span",{className:"aqp-doc__meta-label",children:"Valid Until"}),e.jsx("strong",{children:a.validUntil})]}),e.jsxs("div",{className:"aqp-doc__meta-cell",children:[e.jsx("span",{className:"aqp-doc__meta-label",children:"Currency"}),e.jsx("strong",{children:a.currency})]})]}),e.jsxs("table",{className:"aqp-doc__table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{width:"56px"},children:"Sr."}),e.jsx("th",{children:"Description"}),e.jsx("th",{style:{width:"80px"},children:"Qty"}),e.jsx("th",{style:{width:"88px"},children:"Unit"}),e.jsx("th",{style:{width:"120px"},children:"Rate"}),e.jsx("th",{style:{width:"140px"},children:"Amount"})]})}),e.jsx("tbody",{children:a.lineItems.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,children:"No quotation items available."})}):a.lineItems.map(r=>e.jsxs("tr",{children:[e.jsx("td",{className:"aqp-doc__num",children:r.srNo}),e.jsx("td",{className:"aqp-doc__description",children:r.description}),e.jsx("td",{className:"aqp-doc__num",children:r.quantity}),e.jsx("td",{className:"aqp-doc__num",children:r.unit}),e.jsx("td",{className:"aqp-doc__amount",children:w(r.rate,a.currency)}),e.jsx("td",{className:"aqp-doc__amount",children:w(r.amount,a.currency)})]},r.id))})]}),e.jsxs("div",{className:"aqp-doc__summary",children:[e.jsxs("div",{className:"aqp-doc__summary-card",children:[e.jsx("div",{className:"aqp-doc__eyebrow",children:"Quotation Details"}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"Profile Name"}),e.jsx("span",{children:a.profileName})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"Project"}),e.jsx("span",{children:a.projectName})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"Account Owner"}),e.jsx("span",{children:a.accountOwner})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"Subject"}),e.jsx("span",{children:a.quotationSubject})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"Product"}),e.jsx("span",{children:o})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"Service"}),e.jsx("span",{children:a.otherService})]})]}),e.jsxs("div",{className:"aqp-doc__totals",children:[e.jsx("div",{className:"aqp-doc__eyebrow",children:"Amount Summary"}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"Sub Total"}),e.jsx("span",{children:w(a.subtotal,a.currency)})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"CGST"}),e.jsx("span",{children:w(a.cgst,a.currency)})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"SGST"}),e.jsx("span",{children:w(a.sgst,a.currency)})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"IGST"}),e.jsx("span",{children:w(a.igst,a.currency)})]}),e.jsxs("div",{className:"aqp-doc__kv-row",children:[e.jsx("strong",{children:"Other Tax"}),e.jsx("span",{children:w(a.otherTax,a.currency)})]}),e.jsxs("div",{className:"aqp-doc__kv-row aqp-doc__grand-total",children:[e.jsx("strong",{children:"Total Amount"}),e.jsx("span",{children:w(a.total,a.currency)})]})]})]}),e.jsxs("div",{className:"aqp-doc__amount-words",children:[e.jsx("strong",{children:"Amount in Words"}),e.jsx("span",{children:a.amountInWords})]}),e.jsxs("div",{className:"aqp-doc__terms",children:[e.jsxs("section",{className:"aqp-doc__terms-card",children:[e.jsx("h4",{children:"Inquiry Reference"}),e.jsxs("p",{children:[e.jsx("strong",{children:"Number:"})," ",a.customerReferenceNumber]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Date:"})," ",a.customerReferenceDate]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Subject:"})," ",a.customerReferenceSubject]})]}),e.jsxs("section",{className:"aqp-doc__terms-card",children:[e.jsx("h4",{children:"Terms & Conditions"}),e.jsxs("p",{children:[e.jsx("strong",{children:"Delivery:"})," ",a.deliveryTerms]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Payment:"})," ",a.paymentTerms]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Warranty:"})," ",a.warrantyTerms]})]}),e.jsxs("section",{className:"aqp-doc__terms-card",children:[e.jsx("h4",{children:"Quotation Notes"}),e.jsx("p",{children:a.quotationNotes})]}),e.jsxs("section",{className:"aqp-doc__terms-card",children:[e.jsx("h4",{children:"Status"}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",a.statusLabel]}),a.rejectionReason?e.jsxs("p",{children:[e.jsx("strong",{children:"Reason:"})," ",a.rejectionReason]}):null]})]}),e.jsxs("div",{className:"aqp-doc__footer",children:[e.jsx("strong",{children:a.organizationName}),e.jsx("br",{}),"Website: ",a.website||A.website," | Email: ",a.organizationEmail," | Phone: ",a.organizationPhone]})]})})}function Va({documentData:a,title:s,subtitle:l,onBack:o,onPrint:r,onDownload:i}){const[x,h]=u.useState(100),[N,y]=u.useState(!1);u.useEffect(()=>{h(100)},[a]),u.useEffect(()=>{if(!N)return;const f=()=>y(!1);return window.addEventListener("click",f),()=>window.removeEventListener("click",f)},[N]);const j=s||`QUOTATION - ${(a==null?void 0:a.quotationNumber)||"-"}`,P=l||(a==null?void 0:a.companyName)||"-";return e.jsxs("div",{className:"aqp-page aqp-page--pdf",children:[e.jsxs("div",{className:"aqp-pdf-toolbar",children:[e.jsxs("div",{className:"aqp-pdf-toolbar-copy",children:[e.jsx("h1",{children:j}),e.jsx("p",{children:P})]}),e.jsxs("div",{className:"aqp-pdf-toolbar-actions",children:[e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:o,children:"Back"}),e.jsx("button",{type:"button",className:"aqp-pdf-close-btn",onClick:o,"aria-label":"Close quotation PDF",children:e.jsx($e,{})}),e.jsx("div",{className:"aqp-pdf-toolbar-status",children:e.jsx("span",{children:"PDF View"})}),e.jsxs("div",{className:"aqp-pdf-toolbar-zoom",children:[e.jsx("button",{type:"button",className:"aqp-pdf-icon-btn",onClick:()=>h(f=>Math.max(70,f-10)),"aria-label":"Zoom out",children:e.jsx(ft,{})}),e.jsxs("span",{className:"aqp-pdf-zoom-value",children:[x,"%"]}),e.jsx("button",{type:"button",className:"aqp-pdf-icon-btn",onClick:()=>h(f=>Math.min(160,f+10)),"aria-label":"Zoom in",children:e.jsx(Nt,{})})]}),e.jsxs("button",{type:"button",className:"aqp-pdf-action-btn",onClick:r,"aria-label":"Print quotation",children:[e.jsx(sa,{}),"Print"]}),e.jsxs("button",{type:"button",className:"aqp-pdf-action-btn",onClick:()=>{if(typeof i=="function"){i();return}re(a)},"aria-label":"Download quotation PDF",children:[e.jsx(jt,{}),"Download PDF"]}),e.jsxs("div",{className:"aqp-pdf-more",children:[e.jsx("button",{type:"button",className:`aqp-pdf-icon-btn${N?" aqp-pdf-icon-btn--active":""}`,"aria-label":"More options",onClick:f=>{f.stopPropagation(),y(T=>!T)},"aria-expanded":N,"aria-haspopup":"menu",children:e.jsx(vt,{})}),N?e.jsxs("div",{className:"aqp-action-menu aqp-action-menu--viewer",onClick:f=>f.stopPropagation(),children:[e.jsx("button",{type:"button",className:"aqp-action-item",onClick:()=>{h(100),y(!1)},children:"Reset Zoom"}),e.jsx("button",{type:"button",className:"aqp-action-item",onClick:()=>{h(90),y(!1)},children:"Fit Document"}),e.jsx("button",{type:"button",className:"aqp-action-item",onClick:()=>{r(),y(!1)},children:"Print / Save PDF"})]}):null]})]})]}),e.jsx("div",{className:"aqp-pdf-workspace",children:e.jsx("div",{className:"aqp-pdf-stage",children:e.jsx("div",{className:"aqp-pdf-canvas",children:e.jsx("div",{className:"aqp-pdf-zoom-surface",style:{zoom:x/100},children:e.jsx(Qe,{documentData:a})})})})})]})}const es=({allowUsers:a=!1,generatorPath:s="/admin/quotations"})=>{const l=yt(),{user:o}=qt(),{quotations:r,quotationsLoading:i,quotationsError:x,accounts:h,createQuotation:N,updateQuotation:y,addNotification:j}=wt(),P=a||o&&(o.role==="admin"||o.role==="super_admin");u.useEffect(()=>{P||l("/unauthorized",{replace:!0})},[P,l]);const[f,T]=u.useState("account"),[F]=u.useState(!1),[ve,Z]=u.useState(!1),[ie,ye]=u.useState(Fa),[I,$]=u.useState(Fa),[qe,ce]=u.useState(""),[X,we]=u.useState(""),[de,Se]=u.useState(Pa),[O,L]=u.useState(1),[pe,Y]=u.useState(!1),[ke,R]=u.useState(!1),[c,J]=u.useState(ea),[q,k]=u.useState({}),[ma,E]=u.useState(""),[ue,ha]=u.useState(!1),[D,Ue]=u.useState(He),[V,B]=u.useState(1),[H,Me]=u.useState(null),[De,xa]=u.useState(null),[me,_e]=u.useState(null),[Ve,Ae]=u.useState(!1),[_,ba]=u.useState(null),[G,Be]=u.useState(null),[K,Ge]=u.useState(null),[ga,Ce]=u.useState(""),[Pe,he]=u.useState(""),[ee,Te]=u.useState(""),[fa,Ba]=St(),xe=fa.get("view")||"",ae=u.useMemo(()=>ca(ie.selectedFields,f).map(t=>Ne.find(n=>n.key===t)).filter(Boolean),[ie.selectedFields,f]),Ga=u.useMemo(()=>Ne.filter(t=>!I.selectedFields.includes(t.key)),[I.selectedFields]),te=u.useMemo(()=>h.map((t,n)=>_t(t,n,{recordSource:"admin-quotation-view"})).sort(At),[h]),se=u.useMemo(()=>te.find(t=>String(t.id)===String(c.selectedAccountId||""))||null,[te,c.selectedAccountId]),be=u.useMemo(()=>te.filter(t=>Object.entries(D).every(([n,p])=>{const g=v(p);if(!g)return!0;const m=n==="accountOwner"?t.accountOwnerDisplay||t.accountOwner||"":t[n];return v(m).includes(g)})),[D,te]),ne=u.useMemo(()=>Math.max(1,Math.ceil(be.length/Je)),[be.length]),Ka=u.useMemo(()=>ia(V,ne),[V,ne]),Na=u.useMemo(()=>{const t=(V-1)*Je;return be.slice(t,t+Je)},[V,be]),oe=u.useMemo(()=>r.map((t,n)=>{const p=Ua(t,te),g=S(t.amount)||Ra(t).reduce((m,z)=>m+S(z.amount),0);return{id:t.id||`quotation-${n}`,num:t.quotationNumber||`Quotation ${n+1}`,owner:(p==null?void 0:p.accountOwnerDisplay)||t.selectedAccountOwner||(p==null?void 0:p.accountOwner)||"-",date:Qa(t.quotationDate||t.createdAt),dateSort:t.quotationDate||t.createdAt||"",company:t.companyName||(p==null?void 0:p.name)||t.clientName||"-",amount:g,amountLabel:w(g,t.currency||"INR"),status:t.status||"draft",statusLabel:je(t.status),project:t.projectName||t.product||t.otherProduct||t.otherService||"-",profileName:t.profileName||"-",linkedAccount:p,raw:t}}).sort((t,n)=>new Date(n.dateSort||0).getTime()-new Date(t.dateSort||0).getTime()),[te,r]),U=u.useMemo(()=>oe.filter(t=>f!=="account"&&f!=="deal"?!1:Object.entries(de).every(([n,p])=>{const g=v(p);if(!g)return!0;const m=n==="amount"?`${t.amount} ${t.amountLabel}`:n==="status"?t.statusLabel:t[n];return v(m).includes(g)})),[f,de,oe]),le=u.useMemo(()=>Math.max(1,Math.ceil(U.length/Ye)),[U.length]),Wa=u.useMemo(()=>ia(O,le),[O,le]),Fe=u.useMemo(()=>{const t=(O-1)*Ye;return U.slice(t,t+Ye)},[U,O]);u.useEffect(()=>{L(t=>Math.min(t,le))},[le]),u.useEffect(()=>{B(t=>Math.min(t,ne))},[ne]),u.useEffect(()=>{let t=!0;return(async()=>{try{const p=await Xe.listCustomViews(Aa);if(!t)return;const g=p.find(z=>z.name===Ca)||null;if(!g)return;const m=aa({selectedFields:g.columns});ce(String(g.id||"")),ye(m),$(m),window.localStorage.setItem(na,JSON.stringify(m))}catch{}})(),()=>{t=!1}},[]);const ja=t=>{const n=new URLSearchParams(fa);t?n.set("view",t):n.delete("view"),Ba(n,{replace:!0})},Za=()=>{J(ea()),k({}),E(""),Ue(He),B(1),R(!1),Y(!0)},va=()=>{ue||(Y(!1),R(!1),k({}),E(""))},C=(t,n)=>{J(p=>({...p,[t]:n})),E(""),k(p=>p[t]?{...p,[t]:""}:p)},Xa=()=>{E(""),Ue(He),B(1),R(!0)},ge=(t,n)=>{Ue(p=>({...p,[t]:n})),B(1)},Ya=t=>{J(n=>({...n,selectedAccountId:t.id||"",selectedAccountLabel:[t.accountNumber,t.name].filter(Boolean).join(" - "),clientAccountNumber:t.accountNumber||"",companyName:t.name||"",contactPerson:t.contactPerson||"",address:Dt(t),email:t.contactEmail||t.email||"",phone:t.contactMobile||t.contactPhone||t.phone||"",accountOwner:t.accountOwnerName||t.accountOwner||""})),k(n=>({...n,selectedAccountId:""})),E(""),R(!1)},Ja=t=>{var g;const n=((g=t.target.files)==null?void 0:g[0])||null,p=La(n);if(p){J(m=>({...m,quoteFile:null,quoteFileName:""})),k(m=>({...m,quoteFile:p})),t.target.value="";return}J(m=>({...m,quoteFile:n,quoteFileName:(n==null?void 0:n.name)||""})),k(m=>({...m,quoteFile:""})),E("")},Ha=async t=>{var z,fe,Sa;if(t.preventDefault(),ue)return;const n={};c.selectedAccountId||(n.selectedAccountId="Please select an account from Account List."),c.quoteNumber.trim()||(n.quoteNumber="Quote Number is required."),c.quotationDate||(n.quotationDate="Quotation Date is required."),String(c.totalAmount).trim()||(n.totalAmount="Total Amount is required."),c.quotationStatus||(n.quotationStatus="Quotation Status is required.");const p=La(c.quoteFile);if(p&&(n.quoteFile=p),k(n),E(""),Object.keys(n).length>0)return;const g={quotationNumber:c.quoteNumber.trim(),quotationDate:c.quotationDate,validUntil:c.validUntilDate||c.quotationDate,amount:Number.parseFloat(c.totalAmount)||0,totalAmount:Number.parseFloat(c.totalAmount)||0,taxAmount:Number.parseFloat(c.totalProductTax)||0,productTax:Number.parseFloat(c.totalProductTax)||0,currency:c.amountCurrency||"INR",taxCurrency:c.taxCurrency||c.amountCurrency||"INR",status:c.quotationStatus,clientName:c.contactPerson||c.companyName||c.clientAccountNumber,companyName:c.companyName,clientAccountNumber:c.clientAccountNumber,contactPerson:c.contactPerson,telephone:c.phone,email:c.email,clientAddressDetails:c.address,selectedAccountId:c.selectedAccountId,selectedAccountOwner:c.accountOwner,quotationFileName:((z=c.quoteFile)==null?void 0:z.name)||"",quotationFileSize:((fe=c.quoteFile)==null?void 0:fe.size)||0,quotationFileType:((Sa=c.quoteFile)==null?void 0:Sa.type)||"",projectName:(se==null?void 0:se.projectName)||c.companyName||c.clientAccountNumber};ha(!0);const m=await N(g);if(ha(!1),!m.success){const mt=m.code==="DUPLICATE_QUOTATION"||m.status===409,Ke=m.message||"Unable to upload quotation.";E(Ke),mt?j("warning","Duplicate quotation",Ke):j("error","Error",Ke);return}j("success","Success","Quotation uploaded successfully."),T("account"),L(1),Se(Pa),Y(!1),R(!1),J(ea()),k({}),E("")},Ie=(t,n=!0)=>{_e(t),Ae(n),n&&ja(t.id)},ya=()=>{_e(null),(Ve||xe)&&(Ae(!1),ja(""))};u.useEffect(()=>{if(!xe){Ve&&(_e(null),Ae(!1));return}const t=oe.find(n=>{var p;return String(n.id)===String(xe)||String(((p=n.raw)==null?void 0:p.id)||"")===String(xe)});t&&(Ae(!0),_e(n=>(n==null?void 0:n.id)===t.id?n:t))},[oe,xe,Ve]);const et=t=>t?oe.filter(n=>String(n.raw.selectedAccountId||"")===String(t.id||"")||v(n.raw.clientAccountNumber)===v(t.accountNumber)||v(n.company)===v(t.name)):[],at=t=>{xa(t)},tt=()=>{xa(null)},st=()=>{re(W)},nt=()=>{W&&re(W)},ot=async t=>{const n=aa(t),p={entityType:Aa,name:Ca,columns:n.selectedFields,filters:{},sort:{},isDefault:!1,isShared:!1},g=qe?await Xe.updateCustomView(qe,p):await Xe.upsertCustomViewByName(p);g!=null&&g.id&&ce(String(g.id))},qa=async t=>{if(I.selectedFields.length===0){j("error","Field selection required","Select at least one quotation field.");return}const n=aa(I);if(ye(n),t){window.localStorage.setItem(na,JSON.stringify(n));try{await ot(n)}catch{j("warning","Saved locally","The quotation layout was saved in this browser, but database sync is unavailable right now.")}}Z(!1)},lt=t=>{$(n=>n.selectedFields.includes(t)?n:{...n,selectedFields:[...n.selectedFields,t]})},rt=t=>{$(n=>n.selectedFields.length<=1?n:{...n,selectedFields:n.selectedFields.filter(p=>p!==t)})},it=t=>{!X||X===t||($(n=>{const p=n.selectedFields.indexOf(X),g=n.selectedFields.indexOf(t);if(p<0||g<0)return n;const m=[...n.selectedFields];return m.splice(p,1),m.splice(g,0,X),{...n,selectedFields:m}}),we(""))},ct=t=>{const n=`Quotation_Manager_${f}_${new Date().toISOString().slice(0,10)}`,p=[{label:"View",value:f.toUpperCase()},{label:"Total Records",value:String(U.length)},{label:"Generated On",value:new Date().toLocaleString("en-IN")}],g=U.map(m=>{var z,fe;return{date:m.dateSort||((z=m.raw)==null?void 0:z.quotationDate)||((fe=m.raw)==null?void 0:fe.createdAt)||"",owner:m.owner||"",company:m.company||"",project:m.project||"",num:m.num||"",amountLabel:m.amountLabel||"",statusLabel:m.statusLabel||je(m.status),oldStatus:m.oldStatus||"",newStatus:m.newStatus||"",convertToPo:m.convertToPo||"",poValueJobNo:m.poValueJobNo||"",reasonForLostOrder:m.reasonForLostOrder||""}});Qt({filename:`${n}.xlsx`,title:"Quotation Manager",subtitle:`${f.toUpperCase()} quotations`,sheetName:"Quotation Manager",metadata:p,columns:Mt,rows:g}),j("success","Excel exported","Quotation manager data exported to Excel.")},dt=async()=>{if(!G)return;Te(G.id);const t=await y(G.id,{status:"approved",rejectionReason:"",approvedAt:new Date().toISOString()});if(Te(""),!t.success){j("error","Approval failed",t.message||"Unable to approve this quotation.");return}Be(null),j("success","Quotation approved","The quotation status has been updated to Approved.")},pt=async()=>{const t=ga.trim();if(!t){he("Rejection reason is required.");return}if(!K)return;he(""),Te(K.id);const n=await y(K.id,{status:"rejected",rejectionReason:t,rejectedAt:new Date().toISOString()});if(Te(""),!n.success){j("error","Reject failed",n.message||"Unable to reject this quotation.");return}Ge(null),Ce(""),j("success","Quotation rejected","The quotation has been rejected and the reason was saved.")},Oe=H?Ee(H.raw,H.linkedAccount):null,W=De?Ee(De.raw,De.linkedAccount):null,Le=me?Ee(me.raw,me.linkedAccount):null,ut=H?ra(o,H):[];me&&ra(o,me);const b=(_==null?void 0:_.linkedAccount)||null,wa=u.useMemo(()=>et(b),[b,oe]);return P?W?e.jsx(Va,{documentData:W,title:`QUOTATION - ${W.quotationNumber}`,subtitle:W.companyName,onBack:tt,onPrint:st,onDownload:nt}):e.jsxs("div",{className:"aqp-page",children:[e.jsx("div",{className:"aqp-titlebar",children:e.jsx("h1",{className:"aqp-title",children:"Quotation Manager"})}),e.jsxs("div",{className:"aqp-tab-bar",children:[e.jsxs("div",{className:"aqp-tabs",children:[e.jsx("button",{type:"button",className:`aqp-tab${f==="account"?" aqp-tab--active":""}`,onClick:()=>T("account"),children:"ACCOUNT"}),e.jsx("button",{type:"button",className:`aqp-tab${f==="deal"?" aqp-tab--active":""}`,onClick:()=>T("deal"),children:"DEAL"})]}),e.jsxs("div",{className:"aqp-tab-actions",children:[e.jsxs("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:Za,children:[e.jsx(Ct,{className:"aqp-btn-icon"}),"Upload Quotation"]}),e.jsxs("button",{type:"button",className:"aqp-btn aqp-btn--blue",onClick:()=>l(s,{state:{openGenerator:!0}}),children:[e.jsx(Pt,{className:"aqp-btn-icon"}),"Generate Quotation"]})]})]}),e.jsx("div",{className:"aqp-content-wrapper",children:e.jsxs("div",{className:"aqp-main-content",children:[e.jsx("div",{className:"aqp-report-controls",children:e.jsx("div",{className:"aqp-report-controls-left",children:e.jsx("div",{className:"aqp-report-export",children:e.jsx(Tt,{label:"Export",title:"Export quotation manager",className:"aqp-report-export",buttonClassName:"aqp-report-icon-btn aqp-report-icon-btn--blue aqp-report-icon-btn--export",menuClassName:"aqp-report-export-menu",items:[{key:"quotation-manager-excel",label:"Export to Excel",badge:"XLSX",onClick:()=>ct()}]})})})}),e.jsx("div",{className:"aqp-table-wrap",children:e.jsxs("table",{className:"aqp-table",children:[e.jsxs("thead",{children:[e.jsx("tr",{className:"aqp-thead-row",children:ae.map(t=>e.jsxs("th",{className:`aqp-th aqp-field--${t.key}`,children:[t.label," ",e.jsx(Ft,{className:"aqp-sort-icon"})]},t.key))}),f==="deal"&&e.jsx("tr",{className:"aqp-search-row",children:ae.map(t=>e.jsx("th",{className:`aqp-search-th aqp-field--${t.key}`,children:e.jsx("input",{className:"aqp-search-input",value:de[t.key]||"",onChange:n=>{Se(p=>({...p,[t.key]:n.target.value})),L(1)},placeholder:"Search "+t.label})},t.key))})]}),e.jsx("tbody",{children:i&&Fe.length===0?e.jsx("tr",{className:"aqp-row",children:e.jsx("td",{className:"aqp-td",colSpan:Math.max(1,ae.length),children:"Loading quotations..."})}):x&&Fe.length===0?e.jsx("tr",{className:"aqp-row",children:e.jsx("td",{className:"aqp-td",colSpan:Math.max(1,ae.length),children:x})}):Fe.length===0?e.jsx("tr",{className:"aqp-row",children:e.jsx("td",{className:"aqp-td",colSpan:Math.max(1,ae.length),children:"No quotations found."})}):Fe.map(t=>e.jsx("tr",{className:"aqp-row",onClick:()=>Ie(t),title:`Click to view ${t.num}`,children:ae.map(n=>{if(n.key==="num")return e.jsx("td",{className:`aqp-td aqp-td--num aqp-field--${n.key}`,children:e.jsx("button",{type:"button",className:`aqp-num-badge aqp-num-badge--button ${la(t.status)}`,onClick:m=>{m.stopPropagation(),Ie(t)},children:t.num})},n.key);if(n.key==="status")return e.jsx("td",{className:`aqp-td aqp-field--${n.key}`,children:e.jsx(Da,{status:t.status})},n.key);const p=n.exportValue(t),g=n.key==="company"?`aqp-td aqp-td--link aqp-field--${n.key}`:n.key==="amount"?`aqp-td aqp-td--amount aqp-field--${n.key}`:`aqp-td aqp-field--${n.key}`;return e.jsx("td",{className:g,children:p},n.key)})},t.id))})]})}),e.jsxs("div",{className:"aqp-pagination",children:[e.jsx("span",{className:"aqp-page-icon",children:U.length}),e.jsxs("span",{className:"aqp-total-label",children:["Total records: ",U.length]}),e.jsxs("div",{className:"aqp-page-btns",children:[e.jsx("button",{type:"button",className:"aqp-page-btn",onClick:()=>L(t=>Math.max(1,t-1)),disabled:O===1,children:e.jsx(It,{})}),Wa.map(t=>e.jsx("button",{type:"button",className:`aqp-page-btn${O===t?" aqp-page-btn--active":""}`,onClick:()=>L(t),children:t},t)),e.jsx("button",{type:"button",className:"aqp-page-btn",onClick:()=>L(t=>Math.min(le,t+1)),disabled:O===le,children:e.jsx(Ot,{})})]})]})]})}),ve?e.jsx("div",{className:"aqp-field-panel-overlay",onClick:()=>Z(!1),children:e.jsxs("div",{className:"aqp-field-panel",onClick:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"aqp-field-panel-header",children:[e.jsx("h2",{children:"Select Quotation Report Fields"}),e.jsxs("div",{className:"aqp-field-panel-actions",children:[e.jsx("button",{type:"button",className:"aqp-field-panel-btn aqp-field-panel-btn--ghost",onClick:()=>Z(!1),children:"Close"}),e.jsx("button",{type:"button",className:"aqp-field-panel-btn aqp-field-panel-btn--blue",onClick:()=>qa(!1),children:"Apply"}),e.jsx("button",{type:"button",className:"aqp-field-panel-btn aqp-field-panel-btn--green",onClick:()=>qa(!0),children:"Save & Apply"})]})]}),e.jsxs("div",{className:"aqp-field-panel-grid",children:[e.jsxs("section",{className:"aqp-field-box",children:[e.jsx("div",{className:"aqp-field-box-header",children:"Quotation Fields"}),e.jsx("div",{className:"aqp-field-box-list",children:Ga.map(t=>e.jsxs("button",{type:"button",className:"aqp-field-option",onClick:()=>lt(t.key),children:[e.jsx("span",{children:t.label}),e.jsx("strong",{children:"+"})]},t.key))})]}),e.jsxs("section",{className:"aqp-field-box",children:[e.jsx("div",{className:"aqp-field-box-header",children:"Selected Fields"}),e.jsx("div",{className:"aqp-field-box-list",children:I.selectedFields.map(t=>{const n=Ne.find(p=>p.key===t);return n?e.jsxs("div",{className:"aqp-field-selected",draggable:!0,onDragStart:()=>we(n.key),onDragOver:p=>p.preventDefault(),onDrop:()=>it(n.key),children:[e.jsx("span",{children:n.label}),e.jsx("button",{type:"button",className:"aqp-field-remove",onClick:()=>rt(n.key),children:e.jsx($e,{})})]},n.key):null})})]})]})]})}):null,pe?e.jsx(M,{title:"Upload Account Quotation",onClose:va,size:"aqp-modal--upload",footer:e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:va,disabled:ue,children:"Close"}),e.jsx("button",{type:"submit",form:"aqp-upload-quotation-form",className:"aqp-btn aqp-btn--blue",disabled:ue,children:ue?"Saving...":"Save"})]}),children:e.jsxs("form",{id:"aqp-upload-quotation-form",className:"aqp-upload-form",onSubmit:Ha,children:[e.jsx("div",{className:"aqp-upload-note",children:"Please select the account from the Account List popup before saving the uploaded quotation."}),e.jsxs("div",{className:"aqp-upload-grid",children:[e.jsxs("label",{className:"aqp-form-field aqp-upload-grid__full",children:[e.jsx("span",{className:"aqp-form-label aqp-form-label--required",children:"Select Account"}),e.jsxs("div",{className:"aqp-upload-account-picker",children:[e.jsx("input",{className:`aqp-upload-input${q.selectedAccountId?" aqp-upload-input--error":""}`,value:c.selectedAccountLabel,placeholder:"Click the search icon to select an account",readOnly:!0}),e.jsx("button",{type:"button",className:"aqp-upload-account-button",onClick:Xa,"aria-label":"Search accounts",children:e.jsx(Lt,{})})]}),q.selectedAccountId?e.jsx("div",{className:"aqp-form-error",children:q.selectedAccountId}):null]}),se?e.jsxs("div",{className:"aqp-upload-account-card aqp-upload-grid__full",children:[e.jsx("div",{className:"aqp-upload-account-note",children:"Please double click on another account in the list if you want to change this selection."}),e.jsxs("div",{className:"aqp-upload-account-grid",children:[e.jsxs("div",{className:"aqp-upload-account-item",children:[e.jsx("span",{className:"aqp-upload-account-item-label",children:"Account No."}),e.jsx("span",{className:"aqp-upload-account-item-value",children:se.accountNumber||"-"})]}),e.jsxs("div",{className:"aqp-upload-account-item",children:[e.jsx("span",{className:"aqp-upload-account-item-label",children:"Account Name"}),e.jsx("span",{className:"aqp-upload-account-item-value",children:se.name||"-"})]}),e.jsxs("div",{className:"aqp-upload-account-item",children:[e.jsx("span",{className:"aqp-upload-account-item-label",children:"Email"}),e.jsx("span",{className:"aqp-upload-account-item-value",children:c.email||"-"})]}),e.jsxs("div",{className:"aqp-upload-account-item",children:[e.jsx("span",{className:"aqp-upload-account-item-label",children:"Phone"}),e.jsx("span",{className:"aqp-upload-account-item-value",children:c.phone||"-"})]}),e.jsxs("div",{className:"aqp-upload-account-item",children:[e.jsx("span",{className:"aqp-upload-account-item-label",children:"Account Owner"}),e.jsx("span",{className:"aqp-upload-account-item-value",children:c.accountOwner||"-"})]}),e.jsxs("div",{className:"aqp-upload-account-item aqp-upload-account-item--wide",children:[e.jsx("span",{className:"aqp-upload-account-item-label",children:"Address"}),e.jsx("span",{className:"aqp-upload-account-item-value",children:c.address||"-"})]})]})]}):null,e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label aqp-form-label--required",children:"Quote Number"}),e.jsx("input",{className:`aqp-upload-input${q.quoteNumber?" aqp-upload-input--error":""}`,value:c.quoteNumber,onChange:t=>C("quoteNumber",t.target.value)}),q.quoteNumber?e.jsx("div",{className:"aqp-form-error",children:q.quoteNumber}):null]}),e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label aqp-form-label--required",children:"Quotation Date"}),e.jsx("input",{type:"date",className:`aqp-upload-input${q.quotationDate?" aqp-upload-input--error":""}`,value:c.quotationDate,onChange:t=>C("quotationDate",t.target.value)}),q.quotationDate?e.jsx("div",{className:"aqp-form-error",children:q.quotationDate}):null]}),e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label aqp-form-label--required",children:"Total Amount"}),e.jsxs("div",{className:"aqp-upload-field-inline",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",className:`aqp-upload-input${q.totalAmount?" aqp-upload-input--error":""}`,value:c.totalAmount,onChange:t=>C("totalAmount",t.target.value)}),e.jsx("select",{className:"aqp-upload-select aqp-upload-select--currency",value:c.amountCurrency,onChange:t=>C("amountCurrency",t.target.value),children:Ta.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))})]}),q.totalAmount?e.jsx("div",{className:"aqp-form-error",children:q.totalAmount}):null]}),e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label",children:"Total Product Tax"}),e.jsxs("div",{className:"aqp-upload-field-inline",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",className:"aqp-upload-input",value:c.totalProductTax,onChange:t=>C("totalProductTax",t.target.value)}),e.jsx("select",{className:"aqp-upload-select aqp-upload-select--currency",value:c.taxCurrency,onChange:t=>C("taxCurrency",t.target.value),children:Ta.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))})]})]}),e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label aqp-form-label--required",children:"Quotation Status"}),e.jsx("select",{className:`aqp-upload-select${q.quotationStatus?" aqp-upload-select--error":""}`,value:c.quotationStatus,onChange:t=>C("quotationStatus",t.target.value),children:kt.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value||"select"))}),q.quotationStatus?e.jsx("div",{className:"aqp-form-error",children:q.quotationStatus}):null]}),e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label",children:"Valid Until Date"}),e.jsx("input",{type:"date",className:"aqp-upload-input",value:c.validUntilDate,onChange:t=>C("validUntilDate",t.target.value)})]}),e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label",children:"Contact Person"}),e.jsx("input",{className:"aqp-upload-input",value:c.contactPerson,onChange:t=>C("contactPerson",t.target.value)})]}),e.jsxs("label",{className:"aqp-form-field aqp-upload-grid__full",children:[e.jsx("span",{className:"aqp-form-label",children:"Address"}),e.jsx("textarea",{className:"aqp-textarea",rows:3,value:c.address,onChange:t=>C("address",t.target.value)})]}),e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label",children:"Email"}),e.jsx("input",{className:"aqp-upload-input",value:c.email,onChange:t=>C("email",t.target.value)})]}),e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label",children:"Phone"}),e.jsx("input",{className:"aqp-upload-input",value:c.phone,onChange:t=>C("phone",t.target.value)})]}),e.jsxs("label",{className:"aqp-form-field aqp-upload-grid__full",children:[e.jsx("span",{className:"aqp-form-label aqp-form-label--required",children:"Quote File"}),e.jsx("input",{type:"file",accept:".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",className:`aqp-upload-file-input${q.quoteFile?" aqp-upload-file-input--error":""}`,onChange:Ja}),e.jsx("div",{className:"aqp-upload-file-note",children:"Allowed file types: PDF, XLS, XLSX. Maximum size: 5 MB."}),c.quoteFileName?e.jsx("div",{className:"aqp-upload-file-name",children:c.quoteFileName}):null,q.quoteFile?e.jsx("div",{className:"aqp-form-error",children:q.quoteFile}):null]})]}),ma?e.jsx("div",{className:"aqp-upload-message",children:ma}):null]})}):null,pe&&ke?e.jsx(M,{title:"Account List",onClose:()=>R(!1),size:"aqp-modal--xl",children:e.jsxs("div",{className:"aqp-account-list",children:[e.jsx("div",{className:"aqp-account-list-note",children:"Please double click on the account to select a account."}),e.jsx("div",{className:"aqp-account-list-table-wrap",children:e.jsxs("table",{className:"aqp-account-list-table",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"aqp-account-list-header-row",children:[e.jsx("th",{children:"Account No."}),e.jsx("th",{children:"Account Name"}),e.jsx("th",{children:"Email"}),e.jsx("th",{children:"Phone"}),e.jsx("th",{children:"Account Owner"})]}),e.jsxs("tr",{className:"aqp-account-list-search-row",children:[e.jsx("th",{children:e.jsx("input",{className:"aqp-account-list-search-input",value:D.accountNumber,onChange:t=>ge("accountNumber",t.target.value),placeholder:"Search here ..."})}),e.jsx("th",{children:e.jsx("input",{className:"aqp-account-list-search-input",value:D.name,onChange:t=>ge("name",t.target.value),placeholder:"Search here ..."})}),e.jsx("th",{children:e.jsx("input",{className:"aqp-account-list-search-input",value:D.email,onChange:t=>ge("email",t.target.value),placeholder:"Search here ..."})}),e.jsx("th",{children:e.jsx("input",{className:"aqp-account-list-search-input",value:D.phone,onChange:t=>ge("phone",t.target.value),placeholder:"Search here ..."})}),e.jsx("th",{children:e.jsx("input",{className:"aqp-account-list-search-input",value:D.accountOwner,onChange:t=>ge("accountOwner",t.target.value),placeholder:"Search here ..."})})]})]}),e.jsx("tbody",{children:Na.length>0?Na.map(t=>e.jsxs("tr",{className:`aqp-account-list-row${c.selectedAccountId===t.id?" aqp-account-list-row--selected":""}`,onDoubleClick:()=>Ya(t),children:[e.jsx("td",{children:t.accountNumber||"-"}),e.jsx("td",{children:t.name||"-"}),e.jsx("td",{children:t.email||"-"}),e.jsx("td",{children:t.phone||"-"}),e.jsx("td",{children:t.accountOwnerDisplay||t.accountOwner||"-"})]},t.id)):e.jsx("tr",{children:e.jsx("td",{colSpan:"5",className:"aqp-account-list-empty",children:"No accounts found."})})})]})}),e.jsxs("div",{className:"aqp-account-list-pagination",children:[e.jsxs("span",{className:"aqp-account-list-total",children:["Total records: ",be.length]}),e.jsxs("div",{className:"aqp-account-list-pagination-actions",children:[e.jsx("button",{type:"button",className:"aqp-account-list-page-button",onClick:()=>B(t=>Math.max(1,t-1)),disabled:V===1,children:"prev"}),Ka.map(t=>e.jsx("button",{type:"button",className:`aqp-account-list-page-button${t===V?" aqp-account-list-page-button--active":""}`,onClick:()=>B(t),children:t},t)),e.jsx("button",{type:"button",className:"aqp-account-list-page-button",onClick:()=>B(t=>Math.min(ne,t+1)),disabled:V===ne,children:"next"})]})]})]})}):null,Oe?e.jsx(M,{title:`Quotation Preview - ${Oe.quotationNumber}`,onClose:()=>Me(null),size:"aqp-modal--xl",footer:e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:()=>Me(null),children:"Close"}),e.jsxs("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:()=>re(Oe),children:[e.jsx(sa,{className:"aqp-btn-icon"}),"Print"]}),ut.some(t=>t.key==="pdf")?e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--blue",onClick:()=>{const t=H;Me(null),at(t)},children:"View As PDF"}):null]}),children:e.jsx(Qe,{documentData:Oe})}):null,Le?e.jsxs(M,{title:`View Quotation - ${Le.quotationNumber}`,onClose:ya,size:"aqp-modal--xl",children:[e.jsx("div",{className:"aqp-view-top-actions",children:e.jsxs("div",{className:"aqp-modal-footer-group",children:[e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:ya,children:"Close"}),e.jsxs("button",{type:"button",className:"aqp-btn aqp-btn--blue",onClick:()=>re(Le),children:[e.jsx(sa,{className:"aqp-btn-icon"}),"Print"]})]})}),e.jsx("div",{className:"aqp-view-quotation-document",children:e.jsx(Qe,{documentData:Le})})]}):null,_?e.jsx(M,{title:`View Account - ${_.company}`,onClose:()=>ba(null),size:"aqp-modal--lg",footer:e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:()=>ba(null),children:"Close"}),children:e.jsxs("div",{className:"aqp-account",children:[e.jsxs("div",{className:"aqp-account__grid",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Account No.:"})," ",Q((b==null?void 0:b.accountNumber)||_.raw.clientAccountNumber)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Account Name:"})," ",Q((b==null?void 0:b.name)||_.company)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Email:"})," ",Q((b==null?void 0:b.email)||_.raw.email)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Phone:"})," ",Q((b==null?void 0:b.phone)||_.raw.telephone)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Account Owner:"})," ",Q((b==null?void 0:b.accountOwnerDisplay)||(b==null?void 0:b.accountOwner)||_.raw.selectedAccountOwner)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"GSTIN:"})," ",Q((b==null?void 0:b.gstin)||_.raw.gstin)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"State Code:"})," ",Q((b==null?void 0:b.stateCode)||_.raw.stateCode)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Contact Person:"})," ",Q((b==null?void 0:b.contactPerson)||_.raw.contactPerson)]})]}),e.jsxs("div",{className:"aqp-account__section",children:[e.jsx("h3",{children:"Address"}),e.jsx("p",{children:Q((b==null?void 0:b.address)||_.raw.clientAddressDetails)})]}),e.jsxs("div",{className:"aqp-account__section",children:[e.jsx("h3",{children:"Related Quotations"}),wa.length===0?e.jsx("p",{children:"No related quotations found."}):e.jsxs("table",{className:"aqp-account__table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Quotation No."}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Amount"})]})}),e.jsx("tbody",{children:wa.map(t=>e.jsxs("tr",{onClick:()=>Ie(t),title:`Click to view ${t.num}`,children:[e.jsx("td",{className:"aqp-account__table-cell--num",children:e.jsx("button",{type:"button",className:`aqp-num-badge aqp-num-badge--button ${la(t.status)}`,onClick:n=>{n.stopPropagation(),Ie(t)},children:t.num})}),e.jsx("td",{children:t.date}),e.jsx("td",{children:t.statusLabel}),e.jsx("td",{children:t.amountLabel})]},t.id))})]})]})]})}):null,G?e.jsx(M,{title:"Approve Quote",onClose:()=>Be(null),footer:e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:()=>Be(null),disabled:ee===G.id,children:"Cancel"}),e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--blue",onClick:dt,disabled:ee===G.id,children:ee===G.id?"Approving...":"Approve"})]}),children:e.jsx("p",{children:"Are you sure you want to approve this quote?"})}):null,K?e.jsxs(M,{title:"Reject Quote",onClose:()=>{Ge(null),he(""),Ce("")},footer:e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--gray",onClick:()=>{Ge(null),he(""),Ce("")},disabled:ee===K.id,children:"Cancel"}),e.jsx("button",{type:"button",className:"aqp-btn aqp-btn--blue",onClick:pt,disabled:ee===K.id,children:ee===K.id?"Rejecting...":"Reject Quote"})]}),children:[e.jsxs("label",{className:"aqp-form-field",children:[e.jsx("span",{className:"aqp-form-label",children:"Rejection Reason"}),e.jsx("textarea",{className:`aqp-textarea${Pe?" aqp-textarea--error":""}`,rows:5,value:ga,onChange:t=>{Ce(t.target.value),Pe&&he("")},placeholder:"Enter rejection reason"})]}),Pe?e.jsx("div",{className:"aqp-form-error",children:Pe}):null]}):null]}):null},ts=Object.freeze(Object.defineProperty({__proto__:null,ACTIONS:da,ModalShell:M,QuotationDocument:Qe,QuotationPdfViewer:Va,StatusBadge:Da,buildPrintableHtml:Ma,buildQuotationDocumentData:Ee,buildQuotationViewExportOptions:Ht,buildVisiblePages:ia,default:es,formatListDate:Qa,formatStatusLabel:je,getActionBadgeClassName:la,getAllowedQuotationActions:ra,getStatusClassName:$a,resolveLinkedAccount:Ua,safeLower:v,toNumber:S,triggerBrowserPdfSave:re},Symbol.toStringTag,{value:"Module"}));export{da as A,M,Va as Q,Da as S,Qa as a,Ee as b,Qe as c,Xe as d,ia as e,je as f,la as g,ts as h,Ua as r,v as s,re as t};
