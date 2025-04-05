// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DecentralizedVoting {
    struct Candidate {
        uint id;
        string name;
        address candidateAddress;
        uint voteCount;
    }

    struct Voter {
        bool hasVoted;
        uint votedCandidateId;
    }

    address public admin;
    bool public electionStarted;
    bool public electionEnded;
    uint public candidateCount;

    mapping(uint => Candidate) public candidates;
    mapping(address => Voter) public voters;

    // --- Events ---
    event CandidateAdded(uint candidateId, string name);
    event VoteCast(address voter, uint candidateId);
    event ElectionStarted();
    event ElectionEnded();

    // --- Modifiers ---
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this");
        _;
    }

    modifier onlyDuringElection() {
        require(electionStarted && !electionEnded, "Election is not active");
        _;
    }

    // --- Constructor ---
    constructor() {
        admin = msg.sender;
    }

    // --- Functions ---
    function addCandidate(string memory _name) public onlyAdmin {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, msg.sender, 0);
        emit CandidateAdded(candidateCount, _name);
    }

    function startElection() public onlyAdmin {
        require(!electionStarted, "Election already started");
        electionStarted = true;
        emit ElectionStarted();
    }

    function endElection() public onlyAdmin {
        require(electionStarted, "Election hasn't started");
        require(!electionEnded, "Election already ended");
        electionEnded = true;
        emit ElectionEnded();
    }

    function vote(uint _candidateId) public onlyDuringElection {
        require(!voters[msg.sender].hasVoted, "You already voted");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");

        voters[msg.sender] = Voter(true, _candidateId);
        candidates[_candidateId].voteCount++;

        emit VoteCast(msg.sender, _candidateId);
    }

    function getCandidate(uint _candidateId) public view returns (string memory name, uint voteCount) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        Candidate memory c = candidates[_candidateId];
        return (c.name, c.voteCount);
    }

    function getWinner() public view returns (string memory winnerName, uint highestVotes) {
        require(electionEnded, "Election not yet ended");

        uint maxVotes = 0;
        uint winningCandidateId = 0;

        for (uint i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winningCandidateId = i;
            }
        }

        winnerName = candidates[winningCandidateId].name;
        highestVotes = candidates[winningCandidateId].voteCount;
    }
}
