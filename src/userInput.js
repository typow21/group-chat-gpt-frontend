import React, { useState, useEffect } from "react";
import "./userInput.css"
const UserInput = function () {
  const [shareRoomUsername, setShareRoomUsername] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchProfiles = () => {
        const response = fetch(`${process.env.REACT_APP_ENDPOINT}/profiles/${shareRoomUsername}`
        ).then((response) => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
              }
              return response.json();
        })
        .then((data) => {
            setProfiles(data);
            console.log("profiles", profiles)
            setShowDropdown(true);
        })
        .catch((error) => {
            console.error("There was a problem with the fetch operation:", error);
          });
        }

    if (shareRoomUsername.trim() !== "") {
      fetchProfiles();
    } else {
      setProfiles([]);
      setShowDropdown(false);
    }
  }, [shareRoomUsername]);

  const handleInput = (event) => {
    const { value } = event.target;
    setShareRoomUsername(value);
  };

  const handleSelection = (username) => {
    setShareRoomUsername(username);
    setShowDropdown(false);
  };

  return (
    <div className={showDropdown && profiles.length > 0 ? "userSelectDropdown": ""}>
      <input
        type="text"
        id="shareRoomUsername"
        placeholder="type username here"
        value={shareRoomUsername}
        onChange={handleInput}
      />
      {showDropdown && profiles.length > 0 && (
        <div>
          {profiles.map((profile) => (
            <div 
              key={profile.id}
              onClick={() => setShareRoomUsername(profile.username)}
              className="userSelection"
            >
              {profile.first_name} {profile.last_name} - {profile.username} 
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserInput;
