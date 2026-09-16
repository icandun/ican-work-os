// Protect additive Outcome/KPI state from older clients and legacy restore payloads.
export const OUTCOME_COLLECTIONS = ['units','kpis','kpiEntries','outcomeActuals','workstreams','outcomeReviews'];
export class OutcomeStateError extends Error {
 constructor(code,message,status=422){super(message);this.name='OutcomeStateError';this.code=code;this.status=status;}
}
export function guardOutcomeState(current,incoming) {
 const version=Number(incoming?.oesVersion||0), currentVersion=Number(current?.oesVersion||0);
 if(version<currentVersion) throw new OutcomeStateError('work_client_update_required','Versi Work OS ini perlu diperbarui sebelum menyimpan. Data terbaru tetap aman.',426);
 if(!version) return incoming;
 if(!Number.isInteger(version) || version!==1) throw new OutcomeStateError('unsupported_work_schema','Versi data belum didukung.',422);
 for(const key of OUTCOME_COLLECTIONS) {
  if(!Array.isArray(incoming[key])) throw new OutcomeStateError('incomplete_outcome_state',`Data ${key} tidak lengkap.`);
  const ids=new Set();
  for(const row of incoming[key]) {
   if(!row || typeof row!=='object' || typeof row.id!=='string' || !row.id || ids.has(row.id)) throw new OutcomeStateError('invalid_outcome_record',`ID ${key} tidak valid atau duplikat.`);
   if(key==='units') {
    if(row.image!=null&&row.image!==''&&(typeof row.image!=='string'||row.image.length>32768||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(row.image)))throw new OutcomeStateError('invalid_unit_image','Logo unit harus berupa gambar kecil PNG, JPG atau WebP.');
    if(row.color!=null&&row.color!==''&&!['#5268a0','#886ba4','#3a7882','#927048','#687b54','#956275','#637c94','#8d705f'].includes(row.color))throw new OutcomeStateError('invalid_unit_color','Warna identitas unit tidak valid.');
   }
   ids.add(row.id);
  }
 }
 return incoming;
}
