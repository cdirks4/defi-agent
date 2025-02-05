class UserService {
  private readonly USER_ID_KEY = "defi_assistant_user_id";

  getUserId(): string {
    if (typeof window === "undefined") return "";

    let userId = localStorage.getItem(this.USER_ID_KEY);

    if (!userId) {
      // Generate a new UUID v4
      userId = crypto.randomUUID();
      localStorage.setItem(this.USER_ID_KEY, userId);
    }

    return userId;
  }

  clearUserId(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.USER_ID_KEY);
  }
}

export const userService = new UserService();
