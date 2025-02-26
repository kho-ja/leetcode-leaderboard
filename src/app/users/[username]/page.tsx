import React from "react";
import { useRouter } from "next/router";

const UserProfilePage: React.FC = () => {
  const router = useRouter();
  const { username } = router.query;

  // Fetch user data from an API (this is just a placeholder)
  const userData = {
    username: username,
    name: "John Doe",
    rank: 1234,
    problemsSolved: 150,
    profilePicture: "https://via.placeholder.com/150",
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <img
        src={userData.profilePicture}
        alt={`${userData.name}'s profile`}
        style={{ borderRadius: "50%", width: "150px", height: "150px" }}
      />
      <h1>{userData.name}</h1>
      <p>Username: {userData.username}</p>
      <p>Rank: {userData.rank}</p>
      <p>Problems Solved: {userData.problemsSolved}</p>
    </div>
  );
};

export default UserProfilePage;
