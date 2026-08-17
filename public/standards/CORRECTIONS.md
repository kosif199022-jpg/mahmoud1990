# سجل التصحيحات

كل تعديل هنا إصلاحٌ لخطأ **في استخراج الـPDF أو التعرّف الضوئي**، لا تغييرٌ في المحتوى ولا إعادة صياغة.
كل قاعدة مبنية على دليل من النص نفسه، والحالات الملتبسة تُركت دون مساس.

## خلل في المستخرِج اكتُشف بالمراجعة وأُصلح

دالة ترتيب الرموز المركّبة كانت تعدّ **علامات التشكيل** جزءًا من الرمز المركّب لأنها صفريّة العرض مثله،
فتبدّلها مع الحرف التالي. النتيجة أن نحو **١٣ ألف ضمة** وقعت في غير موضعها:
«تعُد» بدل «تُعد»، و«المسُتثمر» بدل «المُستثمر»، و«المتُحوط» بدل «المُتحوط».

استُثنيت علامات التشكيل من التبديل (`unicodedata.combining`) وأُعيد استخراج الكتابين.
وتبيّن أن الخلل نفسه كان مسؤولًا عن أكثر حالات «يف» — هبطت من ٧١ إلى ١ في الكتاب الأول.

## الفحص الإملائي — ولماذا لم يُطبَّق على العربية

جُرّب على الكتابين العربيين معجمٌ مبنيّ من الكتب نفسها (٢٨٬٨١٥ كلمة فريدة، ٢٬٦٤٧ موثوقة).
أعطى ٣٬٨٣٥ مرشّحًا، لكن مراجعتها كشفت أن أغلبها **كلمات صحيحة**:
«محفوظة» ≠ «محفظة»، و«طباعة» ≠ «طبيعة»، و«ملاءة» ≠ «ملاءمة» (وكلاهما مصطلح محاسبي)،
وعشرات الصيغ المسبوقة بـ«و/ب/ف/ال». الصرف العربي يجعل مسافة التحرير ١ عديمة الدلالة،
**فأُلغي التصحيح الإملائي الآلي للعربية بالكامل** حمايةً للنص.

طُبِّق بدله إصلاحٌ واحد مدعوم بالدليل: علامة تشكيل انفصلت عن كلمتها تُعاد إليها **بشرط**
أن تكون الصيغة المدمجة موثّقة في الكتاب نفسه (≥٥ مرات) وألّا تكون الكلمة أداةً لا تُنوَّن.
من ١٨٧ حالة، استوفت ٢١ الشرط وطُبِّقت، و١٦٦ تُركت.

## التحقّق

- **ضياع المحارف: صفر** في الكتب الثلاثة (جرد الحروف والأرقام وعلامات التشكيل قبل وبعد).
- خطآن سابقان في المصحِّح أُصلحا: إسقاط رقم الفقرة إذا بدأت الفقرة برقم، وشرطٌ صحيح دائمًا عطّل قاعدة فصل الأرقام.
- ٢٤٣ ملف بيانات: لا تلف، ولا فصل مفقود.

---

# سجل تصحيح الكتب العربية

## المعايير الدولية ٢٠١٨

- كلمات بقيت معكوسة وأُصلحت: **3**
- أرقام فقرات أُقحمت داخل الجمل وأُعيدت إلى صدر الفقرة: **608**

| الصورة المعكوسة | الصواب | مرات |
|---|---|---|
|   ٍ بشكل | بشكلٍ | 2 |
| يف | في | 1 |

## المعايير الكاملة ٢٠٢٥

- كلمات بقيت معكوسة وأُصلحت: **48**
- أرقام فقرات أُقحمت داخل الجمل وأُعيدت إلى صدر الفقرة: **361**

| الصورة المعكوسة | الصواب | مرات |
|---|---|---|
| يف | في | 23 |
| اإلفصاح | الإفصاح | 9 |
| اإلثبات | الإثبات | 8 |
|   ً ماليا | مالياً | 2 |
|   ً تناسبيا | تناسبياً | 2 |
|   ً أيضا | أيضاً | 1 |
|   ً فرعيا | فرعياً | 1 |
|   ً كبيرا | كبيراً | 1 |
|   ً مساويا | مساوياً | 1 |

---

# سجل تصحيح كتاب ACCA DipIFR

إجمالي التبديلات: 479 في 224 صيغة مختلفة.

| الخطأ | التصحيح | مرات |
|---|---|---|
| IFAS | IFRS | 82 |
| JAS | IAS | 25 |
| deterred | deferred | 25 |
| toss | loss | 11 |
| currant | current | 8 |
| DiplFR | DipIFR | 7 |
| lite | life | 5 |
| Deterred | Deferred | 4 |
| bean | been | 4 |
| differant | different | 3 |
| fisted | listed | 3 |
| follawing | following | 3 |
| financiat | financial | 3 |
| Septamber | September | 3 |
| Epsifon | Epsilon | 3 |
| milfion | million | 3 |
| doas | does | 3 |
| tive | five | 3 |
| proceads | proceeds | 3 |
| Dalta | Delta | 3 |
| Prasent | Present | 3 |
| dratt | draft | 3 |
| pertormance | performance | 3 |
| millian | million | 3 |
| fease | lease | 3 |
| benetit | benefit | 3 |
| Theretore | Therefore | 3 |
| Omaga | Omega | 3 |
| differance | difference | 3 |
| mitlion | million | 3 |
| batween | between | 3 |
| controiling | controlling | 3 |
| tease | lease | 3 |
| ware | were | 3 |
| expanse | expense | 3 |
| wall | well | 3 |
| tess | less | 3 |
| dees | does | 2 |
| properly | property | 2 |
| mone | more | 2 |
| Aprit | April | 2 |
| Saptember | September | 2 |
| toan | loan | 2 |
| supptier | supplier | 2 |
| baen | been | 2 |
| Totat | Total | 2 |
| tand | land | 2 |
| laase | lease | 2 |
| affact | affect | 2 |
| tinancial | financial | 2 |
| Alpna | Alpha | 2 |
| Aipha | Alpha | 2 |
| thare | there | 2 |
| tuture | future | 2 |
| pariod | period | 2 |
| ragarded | regarded | 2 |
| transterred | transferred | 2 |
| clasing | closing | 2 |
| tiability | liability | 2 |
| principte | principle | 2 |
| transter | transfer | 2 |
| pald | paid | 2 |
| sald | sold | 2 |
| assat | asset | 2 |
| falr | fair | 2 |
| athical | ethical | 2 |
| impairmant | impairment | 2 |
| mathod | method | 2 |
| controliing | controlling | 2 |
| fong | long | 2 |
| controlfing | controlling | 2 |
| intarest | interest | 2 |
| DipIFA | DipIFR | 2 |
| tosses | losses | 2 |
| ther | then | 1 |
| matarial | material | 1 |
| minarity | minority | 1 |
| yeaa | year | 1 |
| SUCCOSS | SUCCESS | 1 |
| Presontation | Presentation | 1 |
| maka | make | 1 |
| avaitable | available | 1 |
| thera | there | 1 |
| sama | same | 1 |
| skitl | skill | 1 |
| quary | query | 1 |
| totai | total | 1 |
| astimate | estimate | 1 |
| setl | sell | 1 |
| aconomic | economic | 1 |
| ptant | plant | 1 |
| environmantal | environmental | 1 |
| Decamber | December | 1 |
| informatian | information | 1 |
| amployee | employee | 1 |
| lagal | legal | 1 |
| considerad | considered | 1 |
| Exnibit | Exhibit | 1 |
| tegal | legal | 1 |
| recelved | received | 1 |
| yaar | year | 1 |
| enterad | entered | 1 |
| generat | general | 1 |
| nead | need | 1 |
| naed | need | 1 |
| ralsed | raised | 1 |
| Agricuiture | Agriculture | 1 |
| Defta | Delta | 1 |
| tactory | factory | 1 |
| refevant | relevant | 1 |
| treatmant | treatment | 1 |
| betow | below | 1 |
| fron | from | 1 |
| casn | cash | 1 |
| fulty | fully | 1 |
| exercisa | exercise | 1 |
| Octobar | October | 1 |
| praceeds | proceeds | 1 |
| wera | were | 1 |
| likaly | likely | 1 |
| aiso | also | 1 |
| elemant | element | 1 |
| Juna | June | 1 |
| Untit | Until | 1 |
| fallowing | following | 1 |
| heen | been | 1 |
| Epsilan | Epsilon | 1 |
| liabitity | liability | 1 |
| periad | period | 1 |
| aquipment | equipment | 1 |
| cradit | credit | 1 |
| Daterred | Deterred | 1 |
| formar | former | 1 |
| ditference | difference | 1 |
| Mareh | March | 1 |
| Prapare | Prepare | 1 |
| specitic | specific | 1 |
| lassee | lessee | 1 |
| rasult | result | 1 |
| profil | profit | 1 |
| atlocated | allocated | 1 |
| retiably | reliably | 1 |
| satisfled | satisfied | 1 |
| sarvice | service | 1 |
| likety | likely | 1 |
| betwean | between | 1 |
| hald | held | 1 |
| annuat | annual | 1 |
| Dacember | December | 1 |
| tolal | total | 1 |
| Lavel | Level | 1 |
| appty | apply | 1 |
| purpase | purpose | 1 |
| scenaria | scenario | 1 |
| causad | caused | 1 |
| controlier | controller | 1 |
| protessional | professional | 1 |
| controtler | controller | 1 |
| obfigation | obligation | 1 |
| shauld | should | 1 |
| tlow | flow | 1 |
| financlal | financial | 1 |
| Tharefore | Therefore | 1 |
| deductibie | deductible | 1 |
| Expianation | Explanation | 1 |
| comprehansive | comprehensive | 1 |
| avallable | available | 1 |
| overail | overall | 1 |
| econamic | economic | 1 |
| biotogical | biological | 1 |
| quidance | guidance | 1 |
| heid | held | 1 |
| difterence | difference | 1 |
| statament | statement | 1 |
| quastion | question | 1 |
| selt | sell | 1 |
| dete | date | 1 |
| recagnition | recognition | 1 |
| statemant | statement | 1 |
| vasting | vesting | 1 |
| therafore | therefore | 1 |
| valua | value | 1 |
| incurrad | incurred | 1 |
| axpense | expense | 1 |
| patential | potential | 1 |
| scanario | scenario | 1 |
| exptain | explain | 1 |
| nota | note | 1 |
| seqment | segment | 1 |
| unil | unit | 1 |
| davelopment | development | 1 |
| proparty | property | 1 |
| thair | their | 1 |
| wauld | would | 1 |
| controlting | controlling | 1 |
| banefit | benefit | 1 |
| whan | when | 1 |
| contralling | controlling | 1 |
| Deferrad | Deferred | 1 |
| investmant | investment | 1 |
| invastment | investment | 1 |
| defarred | deferred | 1 |
| Juty | July | 1 |
| Whan | When | 1 |
| spreadsheat | spreadsheet | 1 |
| Aprif | April | 1 |
| Tolal | Total | 1 |
| controt | control | 1 |
| logs | loss | 1 |
| antered | entered | 1 |
| cartain | certain | 1 |
| Gamna | Gamma | 1 |
| porttolio | portfolio | 1 |
| ratirement | retirement | 1 |
| overatl | overall | 1 |
| cemts | cents | 1 |
| tamporary | temporary | 1 |
| currancy | currency | 1 |
| Bete | Beta | 1 |
| tinance | finance | 1 |
| detined | defined | 1 |
| etfective | effective | 1 |
| Daterredtax | Deferred tax | 1 |
| Currant | Current | 1 |

## حالات تُركت لالتباسها

| الكلمة | مرات | المرشّحون |
|---|---|---|
| tham | 1 | than, them |
| thase | 1 | those, these |