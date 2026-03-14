export class UserModel {
  uid: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  role: string;
  status: string;
  firstTimeAccess: boolean;

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

  static fromFirestore(data: Record<string, unknown>): UserModel {
    return new UserModel(
      (data.uid as string) || "",
      (data.email as string) || "",
      "",
      (data.firstName as string) || "",
      (data.lastName as string) || "",
      (data.department as string) || "",
      (data.role as string) || "",
      (data.status as string) || "Active",
      (data.firstTimeAccess as boolean) || false,
    );
  }

  toFirestore(): Record<string, unknown> {
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
