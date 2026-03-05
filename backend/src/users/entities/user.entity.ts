import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';

export type Platform = 'internshala' | 'linkedin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  fullname: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  password?: string;

  @Column({ type: 'text', nullable: true })
  phone: string;

  @Column({ type: 'text', name: 'masterresumetext', nullable: true })
  masterResumeText: string;

  @Column({ type: 'text', name: 'resumefileurl', nullable: true })
  resumeFileUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  skills: string[];

  @Column({
    type: 'vector',
    nullable: true,
    name: 'profilevector',
  })
  profileVector: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Application, (application) => application.user)
  applications: Application[];
}
