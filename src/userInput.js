import React, { useState, useEffect } from "react";
import "./userInput.css";

const UserInput = function (props) {
  const [profiles, setProfiles] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchProfiles = () => {
      fetch(`${process.env.REACT_APP_ENDPOINT}/profiles/${props.value}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          setProfiles(data);
          setShowDropdown(true);
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
        });
    };

    if (props.value.trim() !== "") {
      fetchProfiles();
    } else {
      setProfiles([]);
      setShowDropdown(false);
    }
  }, [props.value]);

  const handleInputChange = (event) => {
    const { value } = event.target;
    props.onChange(value);
  };

  const handleSelection = (username) => {
    props.onSelect(username);
    setShowDropdown(false);
  };

  return (
    <div className={showDropdown && profiles.length > 0 ? "userSelectDropdown" : ""}>
      <input
        type="text"
        id="shareRoomUsername"
        placeholder="type username here"
        value={props.value}
        onChange={handleInputChange}
      />
      {showDropdown && profiles.length > 0 && (
        <div>
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => handleSelection(profile.username)}
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
