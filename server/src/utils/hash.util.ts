import * as bcrypt from 'bcryptjs';

export class HashUtil {
    static async hash(password: string, saltRounds: number): Promise<string> {
        // Implement your hashing logic here, e.g., using bcrypt
        return await bcrypt.hash(password, saltRounds);
    }

    static async compare(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }
}