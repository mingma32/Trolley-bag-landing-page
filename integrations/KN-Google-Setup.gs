/**
 * KN ORDERS — Google Sheets + Gmail
 * 1. Sign into khumbunuru@gmail.com and open your Google Sheet.
 * 2. Extensions > Apps Script. Replace Code.gs with this entire file.
 * 3. Run setupKN once; approve access to your Sheet and send-email permission.
 * 4. Project Settings > Script Properties: copy ORDER_WEBHOOK_SECRET securely.
 *    Add the same value to your website's server secret ORDER_WEBHOOK_SECRET.
 * 5. Deploy > New deployment > Web app. Execute as: Me.
 *    Who has access: Anyone. Requests require the secret even though URL is public.
 * 6. Put the returned /exec URL in website secret GOOGLE_APPS_SCRIPT_URL.
 * 7. Redeploy website and run one test order using an inbox you control.
 * No Gmail App Password, service account private key or Resend key is needed.
 * This file has no credentials. Never publish Script Properties.
 */
const KN_SHEET_ID = '1Uk7EdAqrp22TG_Ykb0BnTsl8PGc-w5fGFa_TBMioCaM';
const KN_EMAIL = 'khumbunuru@gmail.com';
const KN_HEADERS = ['Order ID','Date & Time','Customer Name','Phone Number','Email Address','Exact Location','Product Name','Quantity','Price Per Piece','Total Price','Payment Method','Order Status','Notes','Business Email Sent','Customer Email Sent'];
function setupKN() {
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('ORDER_WEBHOOK_SECRET')) props.setProperty('ORDER_WEBHOOK_SECRET',Utilities.getUuid()+Utilities.getUuid());
  const ss=SpreadsheetApp.openById(KN_SHEET_ID);
  let sh=ss.getSheetByName('orders'); if(!sh)sh=ss.insertSheet('orders');
  if(sh.getMaxColumns()<15)sh.insertColumnsAfter(sh.getMaxColumns(),15-sh.getMaxColumns());
  if(sh.getMaxRows()<1000)sh.insertRowsAfter(sh.getMaxRows(),1000-sh.getMaxRows());
  // Refuse to overwrite an unrelated table.
  const old=sh.getRange(1,1,1,13).getValues()[0];
  if(old.some((v,i)=>v && String(v)!==KN_HEADERS[i]))throw Error('Header mismatch: review row 1 before setup. Existing data was preserved.');
  sh.getRange(1,1,1,15).setValues([KN_HEADERS]);
  sh.setFrozenRows(1); sh.setFrozenColumns(1); sh.setTabColor('#008f9e');
  sh.getRange(1,1,sh.getMaxRows(),15).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');
  sh.getBandings().forEach(b=>b.remove());
  sh.getRange(1,1,sh.getMaxRows(),15).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY)
    .setHeaderRowColor('#092b4c').setFirstRowColor('#ffffff').setSecondRowColor('#edf6f5');
  sh.getRange(1,1,1,15).setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
  sh.setRowHeight(1,48); sh.setRowHeights(2,sh.getMaxRows()-1,36);
  [310,160,190,150,230,320,170,85,140,140,165,155,270,160,160].forEach((w,i)=>sh.setColumnWidth(i+1,w));
  sh.getRange('D2:D').setNumberFormat('@');
  sh.getRange('B2:B').setNumberFormat('dd mmm yyyy, hh:mm');
  sh.getRange('I2:J').setNumberFormat('"Rs. "#,##0');
  sh.getRange('H2:H').setHorizontalAlignment('center');
  sh.getRange('F2:F').setWrap(true); sh.getRange('M2:M').setWrap(true);
  const statuses=['New Order','Order Confirmed','Order Ongoing','Delivered','Cancelled'];
  sh.getRange('L2:L').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(statuses,true).setAllowInvalid(false).build());
  // Preserve unrelated rules; replace only rules over the Order Status column.
  const rules=sh.getConditionalFormatRules().filter(r=>!r.getRanges().some(x=>x.getColumn()===12&&x.getNumColumns()===1));
  [['New Order','#e1f3ff','#164b76'],['Order Confirmed','#e8e8ff','#46318a'],['Order Ongoing','#fff2d4','#875900'],['Delivered','#dcf5e6','#17613c'],['Cancelled','#fde5e4','#962f32']].forEach(([v,bg,fg])=>rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(v).setBackground(bg).setFontColor(fg).setRanges([sh.getRange('L2:L')]).build()));
  sh.setConditionalFormatRules(rules);
  if(!sh.getFilter())sh.getRange(1,1,sh.getMaxRows(),15).createFilter();
  ss.setSpreadsheetTimeZone('Asia/Kathmandu');
  MailApp.getRemainingDailyQuota(); // Requests send-mail permission, without sending a test email.
  SpreadsheetApp.flush();
}
function knJson(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
function knEscape(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function knSafe(v){const t=String(v).trim();return /^[=+\-@]/.test(t)?"'"+t:t;}
function knTemplate(title,message,rows,customer=false){return '<div style="background:#edf4f2;padding:20px;font-family:Arial;color:#092b4c"><table cellpadding="24" style="width:100%;max-width:600px;margin:auto;background:white"><tr><td style="background:#092b4c;color:white;font-size:22px">KN · Travel made simple</td></tr><tr><td><h1 style="font-size:25px">'+knEscape(title)+'</h1><p style="line-height:1.7">'+knEscape(message)+'</p><table style="width:100%;border-collapse:collapse">'+rows.map(([a,b])=>'<tr><td style="padding:12px;border-bottom:1px solid #ddd">'+knEscape(a)+'</td><td style="padding:12px;border-bottom:1px solid #ddd">'+knEscape(b)+'</td></tr>').join('')+'</table><p style="padding:16px;background:#e1f3ee;line-height:1.7">'+(customer?'Our sales representative will call you soon to arrange delivery.':'Please call the customer soon to confirm the order details.')+'</p><p>Questions? Reply to '+KN_EMAIL+'</p><p>Thank you,<br>KN</p></td></tr></table></div>';}
function doPost(e){
  let lock,sh,row=0,saved=false,id='';
  try{
    if(!e||!e.postData||e.postData.contents.length>12000)return knJson({ok:false,error:'Invalid request.'});
    const d=JSON.parse(e.postData.contents),secret=PropertiesService.getScriptProperties().getProperty('ORDER_WEBHOOK_SECRET');
    if(!secret||d.secret!==secret)return knJson({ok:false,error:'Unauthorized request.'});
    for(const k of ['name','phone','email','location'])if(typeof d[k]!=='string'||!d[k].trim()||d[k].length>(k==='location'?500:120))return knJson({ok:false,error:'Invalid '+k+'.'});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||!/^\+?[\d\s()-]{7,25}$/.test(d.phone)||!Number.isInteger(d.quantity)||d.quantity<1||d.quantity>10||!/^KN-[0-9a-f-]{36}$/.test(d.id))return knJson({ok:false,error:'Invalid order details.'});
    id=d.id;
    lock=LockService.getScriptLock();if(!lock.tryLock(20000))return knJson({ok:false,error:'Order service busy. Retry shortly using the same order.'});
    sh=SpreadsheetApp.openById(KN_SHEET_ID).getSheetByName('orders');
    if(!sh||sh.getRange(1,1).getValue()!=='Order ID')return knJson({ok:false,error:'Run setupKN in Apps Script first.'});
    const found=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext():null;
    const total=d.quantity*3999;
    if(found){row=found.getRow();const prior=sh.getRange(row,1,1,15).getValues()[0];if(prior[4]!==knSafe(d.email)||Number(prior[7])!==d.quantity||prior[2]!==knSafe(d.name)||prior[3]!==knSafe(d.phone)||prior[5]!==knSafe(d.location))return knJson({ok:false,error:'Order reference belongs to different details. Contact KN.'});}
    else{row=sh.getLastRow()+1;if(row>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),100);sh.getRange(row,1,1,15).setValues([[id,new Date(),knSafe(d.name),knSafe(d.phone),knSafe(d.email),knSafe(d.location),'KN Trolley Bag',d.quantity,3999,total,'Cash On Delivery','New Order','','','']]);SpreadsheetApp.flush();}
    saved=true;
    const rows=[['Order ID',id],['Product','KN Trolley Bag'],['Quantity',d.quantity],['Price per piece','Rs. 3,999'],['Delivery','Free'],['Total price','Rs. '+total.toLocaleString('en-US')],['Payment method','Cash On Delivery'],['Order status','New Order']];
    const sent=sh.getRange(row,14,1,2).getValues()[0];
    const required=sent.filter(x=>!x).length;if(MailApp.getRemainingDailyQuota()<required)throw Error('Email quota reached.');
    if(!sent[0]){MailApp.sendEmail({to:KN_EMAIL,replyTo:KN_EMAIL,name:'KN Orders',subject:'New Order Received - '+id,body:'New order '+id+'. Please call the customer soon to confirm this order.',htmlBody:knTemplate('New order received','Please call the customer soon to confirm this order.',[...rows,['Customer',d.name],['Phone',d.phone],['Email',d.email],['Exact location',d.location]])});sh.getRange(row,14).setValue(new Date());SpreadsheetApp.flush();}
    if(!sent[1]){MailApp.sendEmail({to:d.email.trim(),replyTo:KN_EMAIL,name:'KN',subject:'Your Order Is Confirmed - KN',body:'Hi '+d.name+', your order is confirmed. Thank you for shopping with KN. Order ID: '+id+'. Total: Rs. '+total+'. Payment: Cash On Delivery. Our sales representative will call you soon to arrange delivery.',htmlBody:knTemplate('Your order is confirmed!','Hi '+d.name+', thank you for shopping with KN. Your order is confirmed.',rows.map(r=>r[0]==='Order status'?['Order status','Order Confirmed']:r),true)});sh.getRange(row,15).setValue(new Date());SpreadsheetApp.flush();}
    sh.getRange(row,13).setValue('');
    return knJson({ok:true,order:{id,quantity:d.quantity,total}});
  }catch(err){if(saved&&sh&&row)sh.getRange(row,13).setValue('Notification needs review. Contact customer before fulfilling.');return knJson({ok:false,saved,error:saved?'Order '+id+' is saved, but email delivery needs attention. Contact '+KN_EMAIL+' with this ID.':'Order could not be confirmed. Please contact '+KN_EMAIL+'.'});}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
