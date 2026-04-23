export default function MiniTable({ headers, rows, T, maxRows = 8 }) {
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr>
            {headers.map((h,i) => (
              <th key={i} style={{padding:"8px 10px",textAlign:i===0?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",fontSize:11}}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxRows).map((row, ri) => (
            <tr key={ri} style={{borderBottom:`1px solid ${T.border}22`}}>
              {row.map((cell, ci) => (
                <td key={ci} style={{padding:"7px 10px",textAlign:ci===0?"left":"right",color:T.tx,whiteSpace:"nowrap"}}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
