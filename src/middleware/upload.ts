import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve("uploads/reports");

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (_, __, cb) => {
		cb(null, uploadDir);
	},

	filename: (_, file, cb) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

		cb(null, `${unique}${path.extname(file.originalname)}`);
	},
});

export const uploadReporteFotos = multer({
	storage,

	limits: {
		files: 10,
		fileSize: 5 * 1024 * 1024,
	},

	fileFilter: (_, file, cb) => {
		if (!file.mimetype.startsWith("image/")) {
			return cb(new Error("Solo imágenes"));
		}

		cb(null, true);
	},
});
