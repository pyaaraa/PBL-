// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Attendance is Ownable {
    struct AttendanceRecordData {
        address student;
        string courseCode;
        uint256 sessionDate;
        string status;
        string attendanceHash;
        uint256 timestamp;
        bool exists;
    }

    mapping(string => AttendanceRecordData) private _records;
    mapping(address => string[]) private _studentRecords;

    event AttendanceMarked(
        address indexed student,
        string courseCode,
        uint256 sessionDate,
        string status,
        string attendanceHash
    );

    constructor(address initialOwner) Ownable() {
        transferOwnership(initialOwner);
    }

    function recordAttendance(
        address student,
        string calldata courseCode,
        uint256 sessionDate,
        string calldata status,
        string calldata attendanceHash
    ) external onlyOwner {
        require(student != address(0), "Invalid student address");
        require(bytes(attendanceHash).length > 0, "Empty attendance hash");
        require(!_records[attendanceHash].exists, "Attendance already recorded");

        _records[attendanceHash] = AttendanceRecordData({
            student: student,
            courseCode: courseCode,
            sessionDate: sessionDate,
            status: status,
            attendanceHash: attendanceHash,
            timestamp: block.timestamp,
            exists: true
        });

        _studentRecords[student].push(attendanceHash);

        emit AttendanceMarked(student, courseCode, sessionDate, status, attendanceHash);
    }

    function getAttendance(string calldata attendanceHash)
        external
        view
        returns (
            address student,
            string memory courseCode,
            uint256 sessionDate,
            string memory status,
            uint256 timestamp,
            bool exists
        )
    {
        AttendanceRecordData memory rec = _records[attendanceHash];
        return (
            rec.student,
            rec.courseCode,
            rec.sessionDate,
            rec.status,
            rec.timestamp,
            rec.exists
        );
    }

    function getStudentAttendanceHashes(address student) external view returns (string[] memory) {
        return _studentRecords[student];
    }
}
