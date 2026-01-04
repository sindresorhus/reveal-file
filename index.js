import process from 'node:process';
import path from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import childProcess from 'node:child_process';

const execFile = promisify(childProcess.execFile);
const {platform} = process;

export default async function revealFile(filePath) {
	if (typeof filePath !== 'string' && !(filePath instanceof URL)) {
		throw new TypeError(`Expected a string or URL, got ${typeof filePath}`);
	}

	if (filePath instanceof URL) {
		filePath = fileURLToPath(filePath);
	}

	if (!path.isAbsolute(filePath)) {
		throw new TypeError('Path must be absolute');
	}

	if (platform === 'darwin') {
		await execFile('open', ['--reveal', filePath]);
	} else if (platform === 'win32') {
		// Explorer expects backslashes
		const windowsPath = filePath.replaceAll('/', '\\');

		// Explorer returns exit code 1 even when it succeeds.
		try {
			await execFile('explorer.exe', [`/select,${windowsPath}`]);
		} catch (error) {
			if (Number(error?.code) !== 1) {
				throw error;
			}
		}
	} else {
		// Linux: Use D-Bus FileManager1 interface
		// Convert to file:// URL as required by the D-Bus interface
		const fileUrl = `file://${filePath}`;
		// Escape single quotes in the file URL for the shell argument
		const escapedFileUrl = fileUrl.replaceAll('\'', String.raw`'\''`);

		await execFile('gdbus', [
			'call',
			'--session',
			'--dest',
			'org.freedesktop.FileManager1',
			'--object-path',
			'/org/freedesktop/FileManager1',
			'--method',
			'org.freedesktop.FileManager1.ShowItems',
			`['${escapedFileUrl}']`,
			'',
		]);
	}
}
