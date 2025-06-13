// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract DecentralizedVoting {
    using MessageHashUtils for bytes32;
    using ECDSA for bytes32;

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
    mapping(address => bool) public admins;
    address[] public adminList;
    uint public electionCount;
    mapping(uint => Election) public elections;

    event CandidateAdded(
        uint electionId,
        uint candidateId,
        string name,
        address candidateAddress
    );
    event VoteCast(uint electionId, address voter, uint candidateId);
    event ElectionStarted(uint electionId);
    event ElectionEnded(uint electionId);
    event ElectionCreated(uint electionId, string title);

    modifier onlyAdmin() {
        require(
            msg.sender == admin || admins[msg.sender],
            "Only admin can perform this"
        );
        _;
    }

    constructor() {
        admins[msg.sender] = true;
        admin = msg.sender;
        adminList.push(msg.sender);
    }

    function addAdmin(address _admin) public onlyAdmin {
        require(_admin != address(0), "Invalid address");
        require(!admins[_admin], "Already an admin");
        admins[_admin] = true;
        adminList.push(_admin);
    }

    function getAdmins() public view returns (address[] memory) {
        return adminList;
    }

    function removeAdmin(address _admin) public onlyAdmin {
        require(_admin != admin, "Cannot remove primary admin");
        admins[_admin] = false;
    }

    function createElection(string memory _title) public onlyAdmin {
        electionCount++;
        Election storage newElection = elections[electionCount];
        newElection.id = electionCount;
        newElection.title = _title;
        emit ElectionCreated(electionCount, _title);
    }

    function addCandidate(
        uint electionId,
        string memory _name
    ) public onlyAdmin {
        Election storage e = elections[electionId];
        require(!e.started, "Election already started");

        e.candidateCount++;
        e.candidates[e.candidateCount] = Candidate(
            e.candidateCount,
            _name,
            msg.sender,
            0
        );

        emit CandidateAdded(electionId, e.candidateCount, _name, msg.sender);
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
        require(
            candidateId > 0 && candidateId <= e.candidateCount,
            "Invalid candidate"
        );

        e.voters[msg.sender] = Voter(true, candidateId);
        e.candidates[candidateId].voteCount++;

        emit VoteCast(electionId, msg.sender, candidateId);
    }

    function voteWithSignature(
        uint electionId,
        uint candidateId,
        address voterAddress,
        bytes memory signature
    ) public {
        Election storage e = elections[electionId];
        require(e.started && !e.ended, "Election is not active");
        require(!e.voters[voterAddress].hasVoted, "Voter already voted");
        require(
            candidateId > 0 && candidateId <= e.candidateCount,
            "Invalid candidate"
        );

        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(electionId, candidateId, voterAddress)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == voterAddress, "Invalid signature");

        // Record vote
        e.voters[voterAddress] = Voter(true, candidateId);
        e.candidates[candidateId].voteCount++;

        emit VoteCast(electionId, voterAddress, candidateId);
    }

    function getCandidate(
        uint electionId,
        uint candidateId
    ) public view returns (string memory name, uint voteCount) {
        Candidate memory c = elections[electionId].candidates[candidateId];
        return (c.name, c.voteCount);
    }

    function getCandidateDetails(
        uint electionId,
        uint candidateId
    )
        public
        view
        returns (
            uint id,
            string memory name,
            address candidateAddress,
            uint voteCount
        )
    {
        Candidate memory c = elections[electionId].candidates[candidateId];
        return (c.id, c.name, c.candidateAddress, c.voteCount);
    }

    function getVoter(
        uint electionId,
        address voter
    ) public view returns (bool hasVoted, uint votedCandidateId) {
        Voter memory v = elections[electionId].voters[voter];
        return (v.hasVoted, v.votedCandidateId);
    }

    function getWinner(
        uint electionId
    ) public view returns (string memory winnerName, uint highestVotes) {
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

    function isElectionStarted(uint electionId) public view returns (bool) {
        return elections[electionId].started;
    }

    function isElectionEnded(uint electionId) public view returns (bool) {
        return elections[electionId].ended;
    }

    function getElectionCandidates(
        uint electionId
    )
        public
        view
        returns (
            uint[] memory ids,
            string[] memory names,
            address[] memory addresses,
            uint[] memory voteCounts
        )
    {
        Election storage e = elections[electionId];
        uint count = e.candidateCount;

        ids = new uint[](count);
        names = new string[](count);
        addresses = new address[](count);
        voteCounts = new uint[](count);

        for (uint i = 0; i < count; i++) {
            uint candidateId = i + 1;
            Candidate memory c = e.candidates[candidateId];
            ids[i] = c.id;
            names[i] = c.name;
            addresses[i] = c.candidateAddress;
            voteCounts[i] = c.voteCount;
        }

        return (ids, names, addresses, voteCounts);
    }
}
