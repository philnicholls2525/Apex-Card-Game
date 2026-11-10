using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using BepInEx;
using UnityEngine;

namespace ApexBasicBoxTest
{
    [BepInPlugin("apex.basicboxtest", "APEX Basic Box Test", "0.2.0")]
    public sealed class Plugin : BaseUnityPlugin
    {
        private const string ArrayShader = "Unlit/UnlitWithShadowcasterTexture2dArray";
        private const string PlainShader = "Unlit/UnlitWithShadowcaster";
        private Texture2D artwork;
        private Material replacement;
        private readonly Dictionary<Renderer, Material[]> originals = new Dictionary<Renderer, Material[]>();
        private readonly HashSet<string> logged = new HashSet<string>();
        private float nextScan;
        private bool scanning;
        private void Awake() { Logger.LogInfo("APEX Basic Box 0.2 diagnostic started"); nextScan=Time.realtimeSinceStartup+12f; }
        private void Update()
        {
            if(scanning || Time.realtimeSinceStartup<nextScan)return;
            nextScan=Time.realtimeSinceStartup+0.35f;
            StartCoroutine(Scan());
        }
        private IEnumerator Scan()
        {
            scanning=true;
            Renderer[] all=Resources.FindObjectsOfTypeAll<Renderer>();
            int count=0;
            foreach(Renderer r in all)
            {
                if(++count%100==0)yield return null;
                if(r==null || !r.gameObject.scene.IsValid() || !r.gameObject.activeInHierarchy)continue;
                if(originals.ContainsKey(r))continue;
                Material[] mats=r.sharedMaterials;
                for(int i=0;i<mats.Length;i++)
                {
                    Material m=mats[i];
                    if(m==null || m.shader==null || m.shader.name!=ArrayShader)continue;
                    Texture array=m.GetTexture("_MainTexArray");
                    if(array==null || array.name!="CardBox")continue;
                    MaterialPropertyBlock pb=new MaterialPropertyBlock();
                    r.GetPropertyBlock(pb,i);
                    float index=pb.GetFloat("_TexIndex");
                    if(index==0f)index=m.GetFloat("_TexIndex");
                    if(index!=0f)continue;
                    string item=ItemType(r);
                    if(item=="BasicCardBox")
                    {
                        if(EnsureResources())
                        {
                            Material[] modified=(Material[])mats.Clone();
                            modified[i]=replacement;
                            originals[r]=mats;
                            r.sharedMaterials=modified;
                        }
                    }
                    else
                    {
                        string path=PathOf(r.transform);
                        string key=path+"|"+item;
                        if(logged.Add(key) && logged.Count<120)
                            Logger.LogInfo("[APEX ANIMATION CANDIDATE] "+key+" material="+m.name+" renderer="+r.GetType().Name);
                    }
                }
            }
            scanning=false;
        }
        private string ItemType(Renderer r)
        {
            foreach(Component c in r.GetComponentsInParent<Component>(true))
            {
                if(c==null || c.GetType().Name!="Item")continue;
                FieldInfo f=c.GetType().GetField("m_ItemType",BindingFlags.Instance|BindingFlags.NonPublic|BindingFlags.Public);
                return f==null?null:Convert.ToString(f.GetValue(c));
            }
            return null;
        }
        private string PathOf(Transform t)
        {
            string path=t.name;
            for(int n=0;t.parent!=null && n<10;n++) {t=t.parent;path=t.name+"/"+path;}
            return path;
        }
        private bool EnsureResources()
        {
            if(replacement!=null)return true;
            try
            {
                string file=Path.Combine(Path.GetDirectoryName(Info.Location),"APEX_Box_1024.rgba");
                byte[] raw=File.ReadAllBytes(file);
                if(raw.Length!=1024*1024*4)throw new Exception("Unexpected RGBA size");
                artwork=new Texture2D(1024,1024,TextureFormat.RGBA32,false,false);
                artwork.LoadRawTextureData(raw);
                artwork.Apply(false,true);
                Shader shader=Shader.Find(PlainShader);
                if(shader==null)throw new Exception("Missing shader "+PlainShader);
                replacement=new Material(shader);
                replacement.SetTexture("_MainTex",artwork);
                return true;
            }
            catch(Exception e) {Logger.LogError(e);return false;}
        }
        private void OnDestroy()
        {
            foreach(var pair in originals)if(pair.Key!=null)pair.Key.sharedMaterials=pair.Value;
            if(replacement!=null)Destroy(replacement);
            if(artwork!=null)Destroy(artwork);
        }
    }
}
