
class Singularity {
    static size = 1;

    static updateSize(val){
        Singularity.size = val;
    }
}

Singularity.updateSize(222);

console.log(Singularity.size);


const a = false;

try{
    if (!a){
        throw new Error("a is false");
    }
} catch (e){
    if (e instanceof Error){
        console.log("error :", e);
    } else if (e instanceof TypeError){
        console.log("type error : ", e);
    } else {
        console.log("unknown error : ", e);
    }
} finally {
    console.log("finally");
}