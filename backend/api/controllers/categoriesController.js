const db=require('../db');
const {AppError}=require('../../lib/errors');
const columns='id,name,sort_order AS "sortOrder",is_active AS "isActive"';
const formatCategory=category=>({id:category.id,name:category.name,sortOrder:category.sortOrder,isActive:category.isActive});
async function getCategories(req,res){
 const all=req.validatedQuery.all;
 if(all&&req.user.role!=='admin')throw new AppError('PERMISSION_DENIED',403);
 const result=await db.query(`SELECT ${columns} FROM categories ${all?'':'WHERE is_active=TRUE'} ORDER BY sort_order ASC,name ASC,id ASC`);
 res.json({success:true,data:result.rows.map(formatCategory)});
}
async function createCategory(req,res){
 const row=(await db.query(`INSERT INTO categories(name,sort_order) VALUES($1,$2) RETURNING ${columns}`,[req.body.name,req.body.sortOrder])).rows[0];
 res.status(201).json({success:true,data:formatCategory(row)});
}
async function updateCategory(req,res){
 const d=req.body;
 const row=(await db.query(`UPDATE categories SET name=COALESCE($2,name),sort_order=COALESCE($3,sort_order),is_active=COALESCE($4,is_active),updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING ${columns}`,[req.params.id,d.name??null,d.sortOrder??null,d.isActive??null])).rows[0];
 if(!row)throw new AppError('NOT_FOUND',404);
 res.json({success:true,data:formatCategory(row)});
}
module.exports={getCategories,createCategory,updateCategory,formatCategory};
