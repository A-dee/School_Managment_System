# School Management System (SMS) Verification Checklist

Use this checklist to manually test and verify all the new refactoring, security, and premium features we've implemented in the project.

---

## 1. Frontend Cookie Namespacing
- [ ] Open your browser's Developer Tools (`F12`) and navigate to the **Application** $\rightarrow$ **Cookies** tab.
- [ ] Log in at `http://localhost:3000/login` with:
  * **Email:** `superadmin@school.com`
  * **Password:** `Admin@1234`
- [ ] Confirm that the stored cookie names are prefixed with `sms_`:
  * `sms_access_token`
  * `sms_refresh_token`
  * `sms_user_role`
- [ ] Confirm you do not get stuck on "Checking your session..." due to stale cookies from other localhost projects.

---

## 2. Inactivity Auto-Logout (5 Minutes)
- [ ] Log into the dashboard.
- [ ] Leave the browser tab active and do not touch your keyboard, mouse, or screen for **5 minutes**.
- [ ] Verify that:
  - [ ] A red alert toast appears: *"You have been logged out due to inactivity."*
  - [ ] You are automatically redirected back to the `/login` page.
  - [ ] Cookies (`sms_access_token`, etc.) are successfully deleted from the browser.

---

## 3. PHP SMTP Password Reset Mailer
- [ ] Open the root [`.env`](file:///c:/Users/adeye/Desktop/projects/School_managment_system/.env) file and configure your SMTP variables at the bottom:
  ```env
  SMTP_HOST=your_smtp_host
  SMTP_PORT=587
  SMTP_USER=your_smtp_user
  SMTP_PASSWORD=your_smtp_password
  SMTP_SECURE=tls
  ```
- [ ] Visit `http://localhost:3000/login` and click **Forgot password?**.
- [ ] Enter a valid registered email (e.g., `superadmin@school.com`) and click **Send Reset Link**.
- [ ] Check your mail inbox to confirm the password reset link email was successfully sent.
- [ ] Check the backend FastAPI server console logs to verify that `mail.php` was executed successfully.

---

## 4. Smart Attendance Gatekeeper & Parent Alerts
- [ ] Navigate to the Gatekeeper scan page: `http://localhost:3000/admin/attendance-checkin`
- [ ] Select **Check-In (Arrival)**.
- [ ] Input a valid student's Admission Number (e.g., check `seed.py` or the student registry for active numbers) and click **Submit / Scan**.
- [ ] Confirm that:
  - [ ] A success popup appears with the student's name, class, and time.
  - [ ] The backend console logs show a simulated parent notification trigger:
    *`Simulated parent email to=parent_email@example.com subject=Attendance update body=...`*
- [ ] Change the toggle to **Check-Out (Departure)** and repeat the process to test check-out timestamps.

---

## 5. Tuition Installment Planner
- [ ] Log in as Admin, navigate to **Invoices** (`http://localhost:3000/admin/invoices`), and click **Installment Planner** next to a student invoice.
- [ ] Set up a **3-Split Installment Plan** (e.g., Down Payment 50%, Month 1 25%, Month 2 25%) with custom due dates and click **Save**.
- [ ] Log out, and log in with the **Parent account** linked to that student.
- [ ] Navigate to the **Fees** tab (`http://localhost:3000/parent/fees`).
- [ ] Confirm that:
  - [ ] An interactive vertical stepper timeline displays all 3 milestones.
  - [ ] Clicking **Pay Milestone** triggers the Paystack checkout flow for the exact amount due.

---

## 6. Dynamic Timetable & Override Engine
- [ ] Navigate to `http://localhost:3000/admin/timetable`.
- [ ] Click **Create Period** and define a schedule period (e.g., *Period 1: 08:00 to 09:00*).
- [ ] Select a class (e.g., JSS1A), click the cell for **Monday Period 1**, assign a Subject and Teacher Alice, and save.
- [ ] Select another class (e.g., JSS1B), click the cell for **Monday Period 1**, and try to assign Teacher Alice.
- [ ] Confirm that a warning dialog pops up alerting you that Alice has a conflict.
- [ ] Click **Yes, save anyway** (Force override) and verify that the combined class slot successfully saves.
- [ ] Log in as Teacher Alice and verify that her dashboard schedule widget displays both classes scheduled together in that period slot.
