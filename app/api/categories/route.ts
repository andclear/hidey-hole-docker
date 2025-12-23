import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/services/category-service';

export async function GET() {
  try {
    const data = await categoryService.getCategories();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Categories List Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, description } = body;

    if (!name) {
        return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const data = await categoryService.createCategory({ name, color, description });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Category Create Error:', error);
    if (error.message === 'Category already exists') {
        return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
