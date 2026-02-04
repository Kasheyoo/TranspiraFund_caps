export class UserModel {
  constructor(
    uid = "",
    email = "",
    password = "",
    firstName = "",
    lastName = "",
    department = "",
    role = "",
    status = "Active",
    firstTimeAccess = true,
  ) {
    this.uid = uid;
    this.email = email;
    this.password = password;
    this.firstName = firstName;
    this.lastName = lastName;
    this.department = department;
    this.role = role;
    this.status = status;
    this.firstTimeAccess = firstTimeAccess;
  }

  // Create from Firestore document
  static fromFirestore(data) {
    return new UserModel(
      data.uid || "",
      data.email || "",
      "", // Don't store password in model
      data.firstName || "",
      data.lastName || "",
      data.department || "",
      data.role || "",
      data.status || "Active",
      data.firstTimeAccess || false,
    );
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      uid: this.uid,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      department: this.department,
      role: this.role,
      status: this.status,
      firstTimeAccess: this.firstTimeAccess,
      createdAt: new Date().toISOString(),
      createdBy: this.uid,
    };
  }
}
