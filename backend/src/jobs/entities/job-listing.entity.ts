import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';

export type Platform = 'internshala' | 'linkedin' | 'other';

@Entity('joblistings')
export class JobListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  platform: Platform;

  @Column({ type: 'text', name: 'externalid' })
  externalId: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  company: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  requirements: string[];

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({
    type: 'vector',
    nullable: true,
    name: 'descriptionvector',
  })
  descriptionVector: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];
}



