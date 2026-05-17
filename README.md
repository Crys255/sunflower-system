# Sunflower System

Sunflower System adalah aplikasi operasional UMKM berbasis `Next.js 16`, `React 19`, dan `MySQL`.

Fitur utama yang saat ini sudah aktif:
- login owner dengan session cookie
- reset password via OTP email
- dashboard operasional
- inventory management dengan threshold `low stock` dan `ideal stock`
- financial report
- user management owner

## Stack

- `Next.js 16`
- `TypeScript`
- `Tailwind CSS`
- `mysql2`
- `bcryptjs`
- `jose`
- `nodemailer`

## Struktur Penting

- App root: [my-app](D:/uv/Semester%206/Capstone/project-app/my-app)
- Database schema: [sunflower_mysql_schema.sql](D:/uv/Semester%206/Capstone/project-app/my-app/database/sunflower_mysql_schema.sql)
- Cleanup data awal: [clear_dummy_operational_data.sql](D:/uv/Semester%206/Capstone/project-app/my-app/database/clear_dummy_operational_data.sql)
- SQL user database app: [create_app_db_user.sql](D:/uv/Semester%206/Capstone/project-app/my-app/database/create_app_db_user.sql)

## Environment

Copy nilai dari [.env.example](D:/uv/Semester%206/Capstone/project-app/my-app/.env.example) ke `.env.local`.

Contoh:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=sunflower_app
MYSQL_PASSWORD=your_app_db_password
MYSQL_DATABASE=sunflower_system
AUTH_SECRET=replace_with_a_long_random_secret
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email_username
SMTP_PASS=your_email_password
SMTP_FROM="Sunflower System <no-reply@yourdomain.com>"
```

## Local Development

Install dependency:

```bash
npm install
```

Jalankan app:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

## Database Setup

1. Buat atau import schema:

```sql
SOURCE D:/uv/Semester 6/Capstone/project-app/my-app/database/sunflower_mysql_schema.sql;
```

2. Buat user database khusus aplikasi:

```sql
SOURCE D:/uv/Semester 6/Capstone/project-app/my-app/database/create_app_db_user.sql;
```

3. Jika ingin mulai dari data operasional kosong:

```sql
SOURCE D:/uv/Semester 6/Capstone/project-app/my-app/database/clear_dummy_operational_data.sql;
```

## Kondisi Data Saat Ini

Project ini sudah disiapkan untuk start dari kondisi kosong:
- user aplikasi: owner saja
- inventory: kosong
- financial transactions: kosong
- stock movements: kosong

## Hosting Rekomendasi

Paling cocok:
- App: `Vercel`
- Database: `Railway`, `Aiven`, atau MySQL managed hosting lain

## Checklist Sebelum Deploy

1. Pastikan `npm run build` sukses
2. Pastikan `.env.local` lokal sudah benar
3. Import schema ke database online
4. Buat user database online untuk aplikasi
5. Isi environment variables di Vercel
6. Test login owner
7. Test add item inventory
8. Test add financial transaction
9. Test forgot password email OTP
