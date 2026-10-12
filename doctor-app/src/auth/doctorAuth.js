import AsyncStorage from '@react-native-async-storage/async-storage';
const API_BASE = 'https://dr-pranali-dental-api.onrender.com';
export class DoctorAuthError extends Error { constructor(message,code=null,status=null){super(message);this.name='DoctorAuthError';this.code=code;this.status=status;} }
async function post(path,payload){
  let response;try{response=await fetch(API_BASE+path,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});}catch{throw new DoctorAuthError('The clinic service could not be reached. Please try again.','NETWORK_ERROR');}
  const raw=await response.text();let data=null;try{data=raw?JSON.parse(raw):null;}catch{}
  if(!response.ok){const d=data?.detail;throw new DoctorAuthError((typeof d==='string'?d:d?.message)||'Sign-in failed. Please try again.',typeof d==='object'?d?.code:null,response.status);}
  if(!data?.access_token)throw new DoctorAuthError('The clinic server did not return a session.','SESSION_MISSING');
  await AsyncStorage.setItem('doctor_session',data.access_token);await AsyncStorage.setItem('doctor_user',JSON.stringify(data.user||{}));await AsyncStorage.setItem('doctor_auth_method','clinic-password-v1');return data;
}
export async function signInWithPassword(email,password){return post('/v1/dental/auth/password',{email:String(email||'').trim().toLowerCase(),password});}
export async function setupFirstDoctor({email,password,displayName,setupToken}){return post('/v1/dental/auth/bootstrap',{email:String(email||'').trim().toLowerCase(),password,display_name:String(displayName||'').trim(),setup_token:setupToken});}
export async function changeDoctorPassword(token,currentPassword,newPassword){
  const response=await fetch(API_BASE+'/v1/dental/auth/password/change',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({current_password:currentPassword,new_password:newPassword})});
  const raw=await response.text();let data=null;try{data=raw?JSON.parse(raw):null;}catch{}
  if(!response.ok){const d=data?.detail;throw new DoctorAuthError((typeof d==='string'?d:d?.message)||'Password change failed.',typeof d==='object'?d?.code:null,response.status);}return data;
}
export async function getStoredDoctorSession(){const method=await AsyncStorage.getItem('doctor_auth_method');if(method!=='clinic-password-v1'){await AsyncStorage.multiRemove(['doctor_session','doctor_user','doctor_auth_method']);return null;}return AsyncStorage.getItem('doctor_session');}
export async function getStoredDoctorUser(){const value=await AsyncStorage.getItem('doctor_user');try{return value?JSON.parse(value):null;}catch{return null;}}
export async function signOutDoctor(){const token=await AsyncStorage.getItem('doctor_session');try{if(token)await fetch(API_BASE+'/v1/dental/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'}});}catch{}await AsyncStorage.multiRemove(['doctor_session','doctor_user','doctor_auth_method']);}
