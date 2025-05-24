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

    struct Election {
        uint id;
        string title;
        bool started;
        bool ended;
        uint candidateCount;
        mapping(uint => Candidate) candidates;
        mapping(address => Voter) voters;
    }

    address public admin;
    uint public electionCount;
    mapping(uint => Election) public elections;

    event CandidateAdded(uint electionId, uint candidateId, string name);
    event VoteCast(uint electionId, address voter, uint candidateId);
    event ElectionStarted(uint electionId);
    event ElectionEnded(uint electionId);
    event ElectionCreated(uint electionId, string title);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createElection(string memory _title) public onlyAdmin {
        electionCount++;
        Election storage newElection = elections[electionCount];
        newElection.id = electionCount;
        newElection.title = _title;

        emit ElectionCreated(electionCount, _title);
    }

    function addCandidate(uint electionId, string memory _name) public onlyAdmin {
        Election storage e = elections[electionId];
        require(!e.started, "Election already started");

        e.candidateCount++;
        e.candidates[e.candidateCount] = Candidate(
            e.candidateCount,
            _name,
            msg.sender,
            0
        );

        emit CandidateAdded(electionId, e.candidateCount, _name);
    }

    function startElection(uint electionId) public onlyAdmin {
        Election storage e = elections[electionId];
        require(!e.started, "Election already started");

        e.started = true;
        emit ElectionStarted(electionId);
    }

    function endElection(uint electionId) public onlyAdmin {
        Election storage e = elections[electionId];
        require(e.started && !e.ended, "Election not active");

        e.ended = true;
        emit ElectionEnded(electionId);
    }

    function vote(uint electionId, uint candidateId) public {
        Election storage e = elections[electionId];
        require(e.started && !e.ended, "Election is not active");
        require(!e.voters[msg.sender].hasVoted, "You already voted");
        require(candidateId > 0 && candidateId <= e.candidateCount, "Invalid candidate");

        e.voters[msg.sender] = Voter(true, candidateId);
        e.candidates[candidateId].voteCount++;

        emit VoteCast(electionId, msg.sender, candidateId);
    }

    function getCandidate(uint electionId, uint candidateId) public view returns (string memory name, uint voteCount) {
        Candidate memory c = elections[electionId].candidates[candidateId];
        return (c.name, c.voteCount);
    }

    function getWinner(uint electionId) public view returns (string memory winnerName, uint highestVotes) {
        Election storage e = elections[electionId];
        require(e.ended, "Election not yet ended");

        uint maxVotes = 0;
        uint winningCandidateId = 0;

        for (uint i = 1; i <= e.candidateCount; i++) {
            if (e.candidates[i].voteCount > maxVotes) {
                maxVotes = e.candidates[i].voteCount;
                winningCandidateId = i;
            }
        }

        winnerName = e.candidates[winningCandidateId].name;
        highestVotes = e.candidates[winningCandidateId].voteCount;
    }
}
