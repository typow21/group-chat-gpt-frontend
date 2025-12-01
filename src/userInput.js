import React, { useState, useEffect, useRef } from "react";
import "./userInput.css";

const UserInput = function (props) {
  const [profiles, setProfiles] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (props.friends) {
      if (props.value.trim() !== "") {
        const filtered = props.friends.filter(f =>
          f.username.toLowerCase().includes(props.value.toLowerCase()) ||
          f.first_name.toLowerCase().includes(props.value.toLowerCase()) ||
          f.last_name.toLowerCase().includes(props.value.toLowerCase())
        );
        setProfiles(filtered);
        setShowDropdown(true);
      } else {
        setProfiles([]);
        setShowDropdown(false);
      }
      return;
    }

    const fetchProfiles = () => {
      return fetch(`${process.env.REACT_APP_ENDPOINT}/profiles/${props.value}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          setProfiles(data);
          // Show dropdown even if there are no results so 'No results' can be shown
          setShowDropdown(true);
          setSelectedIndex(-1);
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
        });
    };

    if (props.value.trim() !== "") {
      // debounce to reduce flicker and network calls
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        fetchProfiles();
      }, 250);
    } else {
      setProfiles([]);
      setShowDropdown(false);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [props.value, props.friends]);

  const handleInputChange = (event) => {
    const { value } = event.target;
    props.onChange(value);
  };

  const handleSelection = (username) => {
    props.onSelect(username);
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, profiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < profiles.length) {
        handleSelection(profiles[selectedIndex].username);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const activeDescendant = selectedIndex >= 0 ? `user-option-${selectedIndex}` : undefined;

  return (
    <div ref={containerRef} className={["userSelectDropdown", showDropdown ? 'show' : ''].join(' ')}>
      <input
        type="text"
        id="shareRoomUsername"
        placeholder="type username here"
        value={props.value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        role="combobox"
        aria-controls="user-options"
        aria-activedescendant={activeDescendant}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          role="listbox"
          id="user-options"
          className="dropdown-portal"
        >
          {profiles.length > 0 ? (
            <div className="results-wrapper">
              <div className="dropdown-header">{profiles.length} result{profiles.length !== 1 ? 's' : ''}</div>
              {profiles.map((profile, index) => (
                <div
                  key={profile.id}
                  onClick={() => handleSelection(profile.username)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={["userSelection", selectedIndex === index ? 'selected' : ''].join(' ')}
                  role="option"
                  aria-selected={selectedIndex === index}
                  id={`user-option-${index}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <span className="avatar">{(((profile.first_name && profile.first_name[0]) || '')).toUpperCase()}{(((profile.last_name && profile.last_name[0]) || '')).toUpperCase()}</span>
                    <span className="name">{profile.first_name} {profile.last_name}</span>
                  </div>
                  <span className="username">@{profile.username}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="noResults">No users found for {props.value}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserInput;
