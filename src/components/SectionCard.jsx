export default function SectionCard({ title, icon:Icon, children, T, color, action }) {
  return (
    <div style={{background:T.card,borderRadius:14,padding:"18px 20px",border:`1px solid ${T.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {Icon && <Icon size={16} color={color||T.accent}/>}
          <span style={{fontSize:14,fontWeight:600,color:T.tx}}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
