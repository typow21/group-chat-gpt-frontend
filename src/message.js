export const Message = ({ content, sender, id }) => {
    return (
      <div key={id} style={{ border: "1px solid black" }}>
        <h3>{message}</h3>
        <br />
        <b>Blog Writer:</b>
        <p>{username}</p>
        <br />
      </div>
    );
  };
  