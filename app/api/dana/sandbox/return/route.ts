export const dynamic='force-dynamic';
export function GET(request:Request){
  // Discard callback parameters until account binding and state verification are implemented.
  return new Response(null,{status:303,headers:{Location:new URL('/dana-sandbox.html',request.url).href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
}
