export declare class HashUtil {
    static hash(password: string, saltRounds: number): Promise<string>;
    static compare(password: string, hashedPassword: string): Promise<boolean>;
}
