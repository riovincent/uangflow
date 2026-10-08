import {authConfig} from '../../auth-config';
export const dynamic='force-dynamic';
export async function GET() {
  return Response.json(authConfig(),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
