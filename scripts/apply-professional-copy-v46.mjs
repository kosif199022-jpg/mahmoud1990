import fs from 'node:fs';

const path = 'src/v38-books.js';
if (!fs.existsSync(path)) {
  throw new Error(`KOSIF_PROFESSIONAL_COPY_V46_FAIL: missing ${path}`);
}

let source = fs.readFileSync(path, 'utf8');

const replacements = [
  ['التواصل مع أولياء الأمور', 'التواصل مع المكلفين بالحوكمة'],
  ['البيانات المكتوبة', 'الإقرارات المكتوبة'],
  ['التمثيلات', 'الإقرارات المكتوبة'],
  ['استخدام عمل المدققين الداخليين', 'استخدام عمل المراجعين الداخليين'],
  ['استخدام عمل مراجعة الوظائف', 'استخدام عمل المراجعين الداخليين'],
  ['فقرات لفت الانتباه وفقرات أمور أخرى', 'فقرات لفت الانتباه وفقرات الأمور الأخرى في تقرير المراجع المستقل'],
  ['فقرات التأكيد والقيود في التقرير', 'فقرات لفت الانتباه وفقرات الأمور الأخرى في تقرير المراجع المستقل'],
  ['مسؤوليات المدقق المتعلقة بالمعلومات الأخرى', 'مسؤوليات المراجع المتعلقة بالمعلومات الأخرى'],
  ['مسؤوليات المراجع عن المعلومات المصاحبة', 'مسؤوليات المراجع المتعلقة بالمعلومات الأخرى']
];

for (const [from, to] of replacements) {
  source = source.replaceAll(from, to);
}

const required = [
  'التواصل مع المكلفين بالحوكمة',
  'الإقرارات المكتوبة',
  'استخدام عمل المراجعين الداخليين',
  'فقرات لفت الانتباه وفقرات الأمور الأخرى في تقرير المراجع المستقل',
  'مسؤوليات المراجع المتعلقة بالمعلومات الأخرى'
];

for (const phrase of required) {
  if (!source.includes(phrase)) {
    throw new Error(`KOSIF_PROFESSIONAL_COPY_V46_FAIL: missing phrase ${phrase}`);
  }
}

fs.writeFileSync(path, source);
console.log('KOSIF_PROFESSIONAL_COPY_V46_OK');
