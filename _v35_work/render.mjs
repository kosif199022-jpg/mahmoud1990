import fs from 'node:fs';
import {injectProfessionalUpgrade} from './mod/professional-upgrade.js';
import {injectKosifWorkspace} from './mod/kosif-workspace.js';
let h=fs.readFileSync('_v35_base/app-base.html','utf8');
h=injectProfessionalUpgrade(h);
h=injectKosifWorkspace(h);
fs.writeFileSync('_v35_work/rendered-v34.html',h);
const count=x=>(h.match(new RegExp(x,'g'))||[]).length;
console.log(JSON.stringify({bytes:Buffer.byteLength(h),tamhees:count('تمحيص'),Kosif:count('Kosif'),kosif:count('kosif'),bnMap:count('bn-map'),home:count('الرئيسية'),balance:count('الميزان'),rounds:count('الجولات'),pbc:count('المطالبات'),more:count('المزيد')},null,2));
