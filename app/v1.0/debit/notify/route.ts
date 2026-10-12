export const dynamic='force-dynamic';
export function GET(){
  return Response.json({environment:'sandbox',status:'awaiting_configuration',canSync:false},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export function POST(){
  // Sandbox onboarding only: reject callbacks until authentication and durable processing are configured.
  return Response.json({responseCode:'5005601',responseMessage:'Sandbox integration not configured'},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
