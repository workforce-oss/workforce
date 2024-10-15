import fs from 'fs';
import { Stream } from 'stream';
import { StorageClient } from './storage_client.js';
import { UploadResult } from '../../model/internal.js';
import { createHash } from 'crypto';

export class LocalStorageClient implements StorageClient {
  private basePath: string = "/tmp";



  async uploadFile(orgId: string, repositoryId: string, name: string, fileStream: Stream, size?: number): Promise<UploadResult> {
    // ensure the directory exists
    const orgPath = `${this.basePath}/${orgId}`;
    if (!fs.existsSync(orgPath)) {
      fs.mkdirSync(orgPath, { recursive: true });
    }
    const repoPath = `${this.basePath}/${orgId}/${repositoryId}`;
    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
    }
    const filePathParts = name.split('/');
    const fileName = filePathParts.pop();
    const filePath = `${repoPath}/${filePathParts.join('/')}`;
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }
    
    const writeStream = fileStream.pipe(fs.createWriteStream(`${filePath}/${fileName}`));
    const algorithm = 'sha1';
    const hash = createHash(algorithm);
    let hashValue = '';

    // this is a git hash
    if (size) {
      hash.update(`blob ${size}\0`);
    }

    fileStream.on('data', (chunk) => {
      hash.update(chunk);
    });

    fileStream.on('end', () => {
      hashValue = hash.digest('hex');
      console.log(`Hash value: ${hashValue}`);
    });

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve({
          success: true,
          hash: hashValue
        });
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    });
  }

  async deleteFile(orgId: string, repositoryId: string, name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.unlink(`${this.basePath}/${orgId}/${repositoryId}/${name}`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async downloadFile(orgId: string, repositoryId: string, name: string): Promise<{stats: fs.Stats, stream: Stream}> {
    const readStream = fs.createReadStream(`${this.basePath}/${orgId}/${repositoryId}/${name}`);
    const stat = fs.statSync(`${this.basePath}/${orgId}/${repositoryId}/${name}`);
    return { stats: stat, stream: readStream };
  }

  async listRepositories(orgId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(`${this.basePath}/${orgId}`, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }

  async listFiles(orgId: string, repositoryId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(`${this.basePath}/${orgId}/${repositoryId}`, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }
}