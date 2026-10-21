export function waterContact(clientX,clientY,bounds,time){
  if(bounds.width<=0||bounds.height<=0)return null;
  const horizon=bounds.width/bounds.height<.8?.35:.43;
  return {
    x:Math.max(0,Math.min(1,(clientX-bounds.left)/bounds.width)),
    y:Math.max(.04,Math.min(horizon-.025,1-(clientY-bounds.top)/bounds.height)),
    time,
  };
}
