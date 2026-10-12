export const dynamic='force-dynamic';
export function GET(){
  return Response.json({environment:'sandbox',status:'awaiting_configuration',canSync:false},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export function POST(){
  // Sandbox onboarding only: no disbursement processing or financial writes are enabled.
  return Response.json({responseCode:'5004301',responseMessage:'Sandbox integration not configured'},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
